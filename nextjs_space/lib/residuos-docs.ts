import { PDFDocument, rgb, StandardFonts, degrees } from "pdf-lib";
import * as XLSX from "xlsx";
import {
  AlignmentType,
  BorderStyle,
  Document,
  Packer,
  PageBreak,
  Paragraph,
  Table,
  TableCell,
  TableRow,
  TextRun,
  WidthType,
} from "docx";
import * as fs from "fs";
import * as path from "path";

type ResiduoDoc = {
  id?: string;
  numeroRecipiente?: number | string | null;
  numeroOrdinal?: number;
  composicao?: string | null;
  classe?: string | null;
  estado?: string | null;
  tipoRecipiente?: string | null;
  volumeAtual?: number | null;
  volumeAtualLitros?: number | null;
  volume?: number | null;
  volumeRecipiente?: number | null;
  volumeRecipienteLitros?: number | null;
  responsavel?: string | null;
  departamento?: string | null;
  data?: string | Date | null;
  ph?: number | null;
  observacoes?: string | null;
  presencaEnxofre?: boolean | null;
  enxofre?: boolean | null;
  geradorCianetos?: boolean | null;
  cianeto?: boolean | null;
  aminas?: boolean | null;
  halogenadosPercentual?: number | null;
  halogenados?: number | null;
  acetonitrilaPercentual?: number | null;
  acetonitrila?: number | null;
  metaisPesadosPercentual?: number | null;
  metaisPesados?: number | null;
};

type MetadadosCampanha = {
  departamento?: string;
  responsavelInformacoes?: string;
  responsavel?: string;
  data?: string | Date;
};

function getTemplatePath(filename: string): string {
  const candidates = [
    path.join(process.cwd(), "templates", "residuos", filename),
    path.join(process.cwd(), "nextjs_space", "templates", "residuos", filename),
    path.join(__dirname, "..", "..", "templates", "residuos", filename),
    path.join(__dirname, "..", "templates", "residuos", filename),
  ];

  for (const p of candidates) {
    if (fs.existsSync(p)) return p;
  }

  throw new Error(
    `Template não encontrado: ${filename}. Procurado em: ${candidates.join(", ")}`
  );
}

export function ensureTemplateExists(): void {
  getTemplatePath("Planilha campanha.xlsx");
  getTemplatePath("rotulo campanha.docx");
}

function formatDatePtBR(value: unknown): string {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("pt-BR");
}

function asNumber(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function asText(value: unknown): string {
  if (value === null || value === undefined) return "-";
  const text = String(value).trim();
  return text || "-";
}

function boolToSimNao(value: unknown): string {
  return Boolean(value) ? "SIM" : "NAO";
}

export async function gerarEtiquetaInterna(residuo: ResiduoDoc): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]);
  const { width, height } = page.getSize();

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  page.drawText("RESIDUO", {
    x: width / 2 - 120,
    y: height / 2 - 50,
    size: 72,
    font: fontBold,
    color: rgb(1, 0.9, 0.2),
    opacity: 0.15,
    rotate: degrees(-45),
  });

  page.drawRectangle({
    x: 35,
    y: 35,
    width: width - 70,
    height: height - 70,
    borderColor: rgb(0.1, 0.1, 0.1),
    borderWidth: 1.5,
    color: rgb(1, 1, 1),
  });

  page.drawText("RESIDUO QUIMICO", {
    x: 50,
    y: height - 62,
    size: 22,
    font: fontBold,
    color: rgb(0, 0, 0),
  });

  page.drawLine({
    start: { x: 50, y: height - 75 },
    end: { x: width - 50, y: height - 75 },
    thickness: 2,
    color: rgb(0.2, 0.2, 0.2),
  });

  const drawField = (label: string, value: string, x: number, y: number, labelWidth = 130) => {
    page.drawText(`${label}:`, { x, y, size: 10, font: fontBold, color: rgb(0, 0, 0) });
    page.drawText(value || "-", {
      x: x + labelWidth,
      y,
      size: 10,
      font,
      color: rgb(0, 0, 0),
    });
  };

  const numeroRecipiente = residuo.numeroRecipiente ?? residuo.numeroOrdinal ?? "-";
  const classe = residuo.classe ?? "-";
  const estado = residuo.estado ?? "-";
  const volumeAtual =
    asNumber(residuo.volumeAtualLitros) ?? asNumber(residuo.volumeAtual) ?? asNumber(residuo.volume);
  const volumeRecipiente = asNumber(residuo.volumeRecipienteLitros) ?? asNumber(residuo.volumeRecipiente);
  const ph = asNumber(residuo.ph);

  let y = height - 110;
  const col1 = 52;
  const col2 = 315;

  drawField("N. Recipiente", String(numeroRecipiente), col1, y);
  drawField("Data", formatDatePtBR(residuo.data), col2, y);
  y -= 28;

  drawField("Composicao", asText(residuo.composicao), col1, y, 82);
  y -= 28;

  drawField("Classe", asText(classe), col1, y);
  drawField("Estado (S/L)", asText(estado), col2, y);
  y -= 28;

  drawField("pH", ph !== null ? String(ph) : "-", col1, y);
  drawField("Tipo Recipiente", asText(residuo.tipoRecipiente), col2, y, 115);
  y -= 28;

  drawField("Volume (L)", volumeAtual !== null ? String(volumeAtual) : "-", col1, y);
  drawField("Vol. Recipiente (L)", volumeRecipiente !== null ? String(volumeRecipiente) : "-", col2, y, 130);
  y -= 28;

  drawField("Responsavel", asText(residuo.responsavel), col1, y);
  drawField("Departamento", asText(residuo.departamento), col2, y);
  y -= 40;

  page.drawRectangle({
    x: 48,
    y: y - 58,
    width: width - 96,
    height: 60,
    borderColor: rgb(0.5, 0.5, 0.5),
    borderWidth: 1,
  });

  page.drawText("CHECKLIST DE SEGURANCA:", { x: col1, y: y - 14, size: 11, font: fontBold });
  page.drawText(`Enxofre: ${boolToSimNao(residuo.presencaEnxofre ?? residuo.enxofre)}`, {
    x: col1,
    y: y - 33,
    size: 10,
    font,
  });
  page.drawText(`Cianeto: ${boolToSimNao(residuo.geradorCianetos ?? residuo.cianeto)}`, {
    x: col2,
    y: y - 33,
    size: 10,
    font,
  });
  page.drawText(`Aminas: ${boolToSimNao(residuo.aminas)}`, {
    x: col1,
    y: y - 51,
    size: 10,
    font,
  });

  y -= 82;

  page.drawRectangle({
    x: 48,
    y: y - 58,
    width: width - 96,
    height: 60,
    borderColor: rgb(0.5, 0.5, 0.5),
    borderWidth: 1,
  });

  const halogenados = asNumber(residuo.halogenadosPercentual ?? residuo.halogenados) ?? 0;
  const acetonitrila = asNumber(residuo.acetonitrilaPercentual ?? residuo.acetonitrila) ?? 0;
  const metaisPesados = asNumber(residuo.metaisPesadosPercentual ?? residuo.metaisPesados) ?? 0;

  page.drawText("COMPOSICAO DETALHADA:", { x: col1, y: y - 14, size: 11, font: fontBold });
  page.drawText(`Halogenados: ${halogenados}%`, { x: col1, y: y - 33, size: 10, font });
  page.drawText(`Acetonitrila: ${acetonitrila}%`, { x: col2, y: y - 33, size: 10, font });
  page.drawText(`Metais Pesados: ${metaisPesados}%`, { x: col1, y: y - 51, size: 10, font });

  y -= 90;

  page.drawRectangle({
    x: 50,
    y,
    width: width - 100,
    height: 40,
    borderColor: rgb(0.8, 0.2, 0.2),
    borderWidth: 2,
    color: rgb(1, 0.95, 0.95),
  });

  page.drawText("ATENCAO: Utilize apenas 75% do volume do frasco", {
    x: 67,
    y: y + 13,
    size: 12,
    font: fontBold,
    color: rgb(0.7, 0.1, 0.1),
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

function cloneCellStyle(
  worksheet: XLSX.WorkSheet,
  targetAddress: string,
  fallbackAddress?: string
): any {
  const target = worksheet[targetAddress] as (XLSX.CellObject & { s?: any }) | undefined;
  if (target?.s) return target.s;

  if (fallbackAddress) {
    const fallback = worksheet[fallbackAddress] as (XLSX.CellObject & { s?: any }) | undefined;
    if (fallback?.s) return fallback.s;
  }

  return undefined;
}

function setCellValuePreservingStyle(
  worksheet: XLSX.WorkSheet,
  address: string,
  value: string | number,
  type: "s" | "n",
  fallbackStyleAddress?: string
): void {
  const style = cloneCellStyle(worksheet, address, fallbackStyleAddress);
  const existing = worksheet[address] as (XLSX.CellObject & { s?: any }) | undefined;

  worksheet[address] = {
    ...(existing || {}),
    t: type,
    v: value,
    ...(style ? { s: style } : {}),
  };
}

function findCellByLabel(worksheet: XLSX.WorkSheet, labelRegex: RegExp): string | null {
  const ref = worksheet["!ref"];
  if (!ref) return null;

  const range = XLSX.utils.decode_range(ref);
  for (let row = range.s.r; row <= range.e.r; row++) {
    for (let col = range.s.c; col <= range.e.c; col++) {
      const address = XLSX.utils.encode_cell({ r: row, c: col });
      const cell = worksheet[address] as XLSX.CellObject | undefined;
      if (!cell?.v) continue;
      const text = String(cell.v).trim();
      if (labelRegex.test(text)) return address;
    }
  }

  return null;
}

function writeMetadataNextToLabel(
  worksheet: XLSX.WorkSheet,
  labelRegex: RegExp,
  value: string
): void {
  const labelAddress = findCellByLabel(worksheet, labelRegex);
  if (!labelAddress || !value) return;

  const { c, r } = XLSX.utils.decode_cell(labelAddress);
  const valueAddress = XLSX.utils.encode_cell({ c: c + 1, r });
  setCellValuePreservingStyle(worksheet, valueAddress, value, "s", valueAddress);
}

export async function gerarPlanilhaCampanha(
  residuos: ResiduoDoc[],
  metadados: MetadadosCampanha
): Promise<Buffer> {
  const templatePath = getTemplatePath("Planilha campanha.xlsx");
  const templateBuffer = fs.readFileSync(templatePath);

  const workbook = XLSX.read(templateBuffer, {
    type: "buffer",
    cellStyles: true,
    cellNF: true,
    cellDates: true,
  });

  const sheetName = workbook.SheetNames[0];
  const worksheet = workbook.Sheets[sheetName];

  const departamento = metadados.departamento || "";
  const responsavel = metadados.responsavelInformacoes || metadados.responsavel || "";
  const data = formatDatePtBR(metadados.data);

  writeMetadataNextToLabel(worksheet, /departamento/i, departamento);
  writeMetadataNextToLabel(worksheet, /respons[aá]vel/i, responsavel);
  writeMetadataNextToLabel(worksheet, /data/i, data === "-" ? "" : data);

  const startRow = 5;

  residuos.forEach((residuo, idx) => {
    const row = startRow + idx;
    const fallbackRow = startRow;

    const numeroOrdinal = residuo.numeroOrdinal || idx + 1;
    const composicao = residuo.composicao || "";
    const classe = residuo.classe || "";
    const estado = residuo.estado || "";
    const tipoRecipiente = residuo.tipoRecipiente || "";
    const volumeAtual =
      asNumber(residuo.volumeAtualLitros) ?? asNumber(residuo.volumeAtual) ?? asNumber(residuo.volume) ?? 0;
    const volumeRecipiente =
      asNumber(residuo.volumeRecipienteLitros) ?? asNumber(residuo.volumeRecipiente) ?? 0;

    setCellValuePreservingStyle(
      worksheet,
      `A${row}`,
      numeroOrdinal,
      "n",
      `A${fallbackRow}`
    );
    setCellValuePreservingStyle(worksheet, `B${row}`, composicao, "s", `B${fallbackRow}`);
    setCellValuePreservingStyle(worksheet, `C${row}`, classe, "s", `C${fallbackRow}`);
    setCellValuePreservingStyle(worksheet, `D${row}`, estado, "s", `D${fallbackRow}`);
    setCellValuePreservingStyle(worksheet, `E${row}`, tipoRecipiente, "s", `E${fallbackRow}`);
    setCellValuePreservingStyle(worksheet, `F${row}`, volumeAtual, "n", `F${fallbackRow}`);
    setCellValuePreservingStyle(worksheet, `G${row}`, volumeRecipiente, "n", `G${fallbackRow}`);
  });

  const currentRange = XLSX.utils.decode_range(worksheet["!ref"] || "A1:G10");
  currentRange.e.r = Math.max(currentRange.e.r, startRow + Math.max(residuos.length - 1, 0));
  currentRange.e.c = Math.max(currentRange.e.c, 6);
  worksheet["!ref"] = XLSX.utils.encode_range(currentRange);

  const outputBuffer = XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
    cellStyles: true,
  });

  return Buffer.from(outputBuffer);
}

function createLabelCell(residuo?: ResiduoDoc, defaultOrdinal = ""): TableCell {
  if (!residuo) {
    return new TableCell({
      width: { size: 50, type: WidthType.PERCENTAGE },
      children: [new Paragraph(" ")],
      margins: { top: 220, right: 220, bottom: 220, left: 220 },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
        bottom: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
        left: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
        right: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
      },
    });
  }

  const ordinal = String(residuo.numeroOrdinal || defaultOrdinal || "");
  const composicao = residuo.composicao || "";
  const classe = residuo.classe || "";
  const estado = residuo.estado || "";
  const ph = residuo.ph ?? "";
  const volumeAtual =
    asNumber(residuo.volumeAtualLitros) ?? asNumber(residuo.volumeAtual) ?? asNumber(residuo.volume) ?? "";

  return new TableCell({
    width: { size: 50, type: WidthType.PERCENTAGE },
    margins: { top: 180, right: 180, bottom: 180, left: 180 },
    borders: {
      top: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
      bottom: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
      left: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
      right: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
    },
    children: [
      new Paragraph({
        alignment: AlignmentType.RIGHT,
        spacing: { after: 80 },
        children: [new TextRun({ text: ordinal, bold: true, size: 44 })],
      }),
      new Paragraph({
        spacing: { after: 60 },
        children: [new TextRun({ text: "RESIDUO QUIMICO", bold: true, size: 28 })],
      }),
      new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: `Composição: ${composicao}` })] }),
      new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: `Classe: ${classe}` })] }),
      new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: `Estado: ${estado}` })] }),
      new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: `pH: ${ph}` })] }),
      new Paragraph({ spacing: { after: 40 }, children: [new TextRun({ text: `Volume: ${volumeAtual} L` })] }),
      new Paragraph({
        spacing: { after: 40 },
        children: [new TextRun({ text: `Responsável: ${residuo.responsavel || ""}` })],
      }),
      new Paragraph({
        spacing: { after: 40 },
        children: [new TextRun({ text: `Departamento: ${residuo.departamento || ""}` })],
      }),
      new Paragraph({
        children: [new TextRun({ text: `Data: ${formatDatePtBR(residuo.data)}` })],
      }),
    ],
  });
}

export async function gerarRotulosCampanha(residuos: ResiduoDoc[]): Promise<Buffer> {
  // Mantém validação explícita do template obrigatório da campanha
  const templatePath = getTemplatePath("rotulo campanha.docx");
  fs.readFileSync(templatePath);

  const children: Array<Table | Paragraph> = [];

  for (let i = 0; i < residuos.length; i += 2) {
    const r1 = residuos[i];
    const r2 = residuos[i + 1];

    children.push(
      new Table({
        width: { size: 100, type: WidthType.PERCENTAGE },
        rows: [
          new TableRow({
            children: [
              createLabelCell(r1, String(i + 1)),
              createLabelCell(r2, String(i + 2)),
            ],
          }),
        ],
      })
    );

    if (i + 2 < residuos.length) {
      children.push(new Paragraph({ children: [new PageBreak()] }));
    }
  }

  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: { top: 500, right: 500, bottom: 500, left: 500 },
          },
        },
        children,
      },
    ],
  });

  return Packer.toBuffer(doc);
}
