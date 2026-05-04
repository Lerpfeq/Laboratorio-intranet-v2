import { PDFDocument, PDFPage, PDFFont, rgb, StandardFonts, degrees } from "pdf-lib";
import * as XLSX from "xlsx";
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
  const responsavel = metadados.responsavel || metadados.responsavelInformacoes || "";
  const data = formatDatePtBR(metadados.data);

  // O template possui células mescladas no cabeçalho (A1:G1, A2:G2, A3:D3, E3:G3).
  // Para garantir preenchimento consistente, escrevemos diretamente nas células do rótulo.
  setCellValuePreservingStyle(
    worksheet,
    "A1",
    `Laboratório/ Responsável: Laboratório de Engenharia de Reações Poliméricas - LERP`,
    "s",
    "A1"
  );
  setCellValuePreservingStyle(
    worksheet,
    "A2",
    `Departamento: ${departamento || "-"}`,
    "s",
    "A2"
  );
  setCellValuePreservingStyle(
    worksheet,
    "A3",
    `Responsável pelas Informações: ${responsavel || "-"}`,
    "s",
    "A3"
  );
  setCellValuePreservingStyle(worksheet, "E3", `Data: ${data === "-" ? "-" : data}`, "s", "E3");

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

function toPdfSafeText(value: unknown): string {
  if (value === null || value === undefined) return "";
  return String(value)
    .replace(/⚠️|⚠/g, "")
    .replace(/[\u{1F300}-\u{1FAFF}]/gu, "")
    .trim();
}

export async function gerarRotulosCampanha(residuos: ResiduoDoc[]): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  for (let i = 0; i < residuos.length; i += 2) {
    const page = pdfDoc.addPage([595, 842]); // A4
    const { width, height } = page.getSize();

    desenharRotulo(page, residuos[i], font, fontBold, 0, height / 2, width, height / 2);

    if (residuos[i + 1]) {
      desenharRotulo(page, residuos[i + 1], font, fontBold, 0, 0, width, height / 2);
    }
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

function desenharRotulo(
  page: PDFPage,
  residuo: ResiduoDoc,
  font: PDFFont,
  fontBold: PDFFont,
  x: number,
  y: number,
  w: number,
  h: number
): void {
  const margin = 20;
  const startX = x + margin;
  const startY = y + h - margin;

  const numeroOrdinal = String(residuo?.numeroOrdinal || "");
  const volumeAtual =
    asNumber(residuo?.volumeAtualLitros) ?? asNumber(residuo?.volumeAtual) ?? asNumber(residuo?.volume) ?? "";
  const volumeRecipiente =
    asNumber(residuo?.volumeRecipienteLitros) ?? asNumber(residuo?.volumeRecipiente) ?? "";
  const halogenados = asNumber(residuo?.halogenadosPercentual ?? residuo?.halogenados) ?? 0;
  const acetonitrila = asNumber(residuo?.acetonitrilaPercentual ?? residuo?.acetonitrila) ?? 0;
  const metaisPesados = asNumber(residuo?.metaisPesadosPercentual ?? residuo?.metaisPesados) ?? 0;

  page.drawRectangle({
    x: x + 10,
    y: y + 10,
    width: w - 20,
    height: h - 20,
    borderWidth: 1,
    borderColor: rgb(0.2, 0.2, 0.2),
  });

  page.drawText(toPdfSafeText(numeroOrdinal), {
    x: x + w - 80,
    y: startY - 30,
    size: 36,
    font: fontBold,
  });

  page.drawText("RESÍDUO QUÍMICO", {
    x: startX,
    y: startY - 30,
    size: 16,
    font: fontBold,
  });

  let currentY = startY - 60;

  const drawField = (label: string, value: string, fontSize = 9) => {
    page.drawText(`${toPdfSafeText(label)}: ${toPdfSafeText(value) || "-"}`, {
      x: startX,
      y: currentY,
      size: fontSize,
      font,
    });
    currentY -= 15;
  };

  drawField("Laboratório/Responsável", toPdfSafeText(`LERP ${residuo?.responsavel ? `- ${residuo.responsavel}` : ""}`));
  drawField("Departamento", toPdfSafeText(residuo?.departamento || ""));
  drawField("Data", residuo?.data ? formatDatePtBR(residuo.data) : "");

  currentY -= 5;
  drawField("Composição do Resíduo", toPdfSafeText(residuo?.composicao || ""));

  currentY -= 5;
  page.drawText(
    `Classe: ${toPdfSafeText(residuo?.classe || "-")} | Estado: ${toPdfSafeText(residuo?.estado || "-")}`,
    {
      x: startX,
      y: currentY,
      size: 9,
      font,
    }
  );
  currentY -= 15;

  drawField("Recipiente de armazenamento", toPdfSafeText(residuo?.tipoRecipiente || ""));
  drawField("Volume do resíduo (L)", String(volumeAtual));
  drawField("Volume do recipiente (L)", String(volumeRecipiente));
  drawField("pH", String(residuo?.ph ?? "-"));

  currentY -= 5;

  page.drawText("Checklist:", { x: startX, y: currentY, size: 9, font: fontBold });
  currentY -= 12;

  const checkbox = (label: string, val: boolean) => {
    page.drawText(`${toPdfSafeText(label)}: ${val ? "SIM" : "NÃO"}`, {
      x: startX,
      y: currentY,
      size: 8,
      font,
    });
    currentY -= 12;
  };

  checkbox("Gerador de cianetos", Boolean(residuo?.geradorCianetos ?? residuo?.cianeto));
  checkbox("Aminas", Boolean(residuo?.aminas));

  currentY -= 5;

  page.drawText("Composição (%):", { x: startX, y: currentY, size: 9, font: fontBold });
  currentY -= 12;
  page.drawText(`Halogenados: ${halogenados}%`, { x: startX, y: currentY, size: 8, font });
  currentY -= 12;
  page.drawText(`Acetonitrila: ${acetonitrila}%`, { x: startX, y: currentY, size: 8, font });
  currentY -= 12;
  page.drawText(`Metais Pesados: ${metaisPesados}%`, { x: startX, y: currentY, size: 8, font });

  currentY = y + 25;
  page.drawText("ATENÇÃO: Utilize apenas 75% do volume do frasco", {
    x: startX,
    y: currentY,
    size: 8,
    font: fontBold,
    color: rgb(0.7, 0, 0),
  });

  if (y > 0) {
    page.drawLine({
      start: { x: x + 10, y: y },
      end: { x: x + w - 10, y: y },
      thickness: 1,
      color: rgb(0.5, 0.5, 0.5),
      dashArray: [3, 3],
    });
  }
}
