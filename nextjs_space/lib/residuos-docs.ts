import { PDFDocument, rgb, StandardFonts, degrees } from "pdf-lib";
import * as XLSX from "xlsx";
import * as fs from "fs";
import * as path from "path";

// Dependência xlsx-style instalada para compatibilidade com ambientes legados.

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
  getTemplatePath("rotulo-campanha-template.xlsx");
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
  fallbackStyleAddress?: string,
  styleOverrides?: any
): void {
  const baseStyle = cloneCellStyle(worksheet, address, fallbackStyleAddress);
  const mergedStyle =
    baseStyle || styleOverrides
      ? {
          ...(baseStyle || {}),
          ...(styleOverrides || {}),
        }
      : undefined;

  const existing = worksheet[address] as (XLSX.CellObject & { s?: any }) | undefined;

  worksheet[address] = {
    ...(existing || {}),
    t: type,
    v: value,
    ...(mergedStyle ? { s: mergedStyle } : {}),
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

  const nomeLaboratorio =
    "Laboratório de Engenharia de Reações Poliméricas - LERP / Prof. Dr. Roniérik Pioli Vieira";

  // O template possui células mescladas no cabeçalho (A1:G1, A2:G2, A3:D3, E3:G3).
  // Para garantir preenchimento consistente, escrevemos diretamente nas células do rótulo.
  setCellValuePreservingStyle(
    worksheet,
    "A1",
    `Laboratório/ Responsável: ${nomeLaboratorio}`,
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

  const blackBorder = {
    top: { style: "thin", color: { rgb: "000000" } },
    bottom: { style: "thin", color: { rgb: "000000" } },
    left: { style: "thin", color: { rgb: "000000" } },
    right: { style: "thin", color: { rgb: "000000" } },
  };

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
      `A${fallbackRow}`,
      { border: blackBorder }
    );
    setCellValuePreservingStyle(worksheet, `B${row}`, composicao, "s", `B${fallbackRow}`, {
      border: blackBorder,
    });
    setCellValuePreservingStyle(worksheet, `C${row}`, classe, "s", `C${fallbackRow}`, {
      border: blackBorder,
    });
    setCellValuePreservingStyle(worksheet, `D${row}`, estado, "s", `D${fallbackRow}`, {
      border: blackBorder,
    });
    setCellValuePreservingStyle(worksheet, `E${row}`, tipoRecipiente, "s", `E${fallbackRow}`, {
      border: blackBorder,
    });
    setCellValuePreservingStyle(worksheet, `F${row}`, volumeAtual, "n", `F${fallbackRow}`, {
      border: blackBorder,
    });
    setCellValuePreservingStyle(worksheet, `G${row}`, volumeRecipiente, "n", `G${fallbackRow}`, {
      border: blackBorder,
    });
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

const LABORATORIO_PADRAO = "Laboratório de Engenharia de Reações Poliméricas - LERP / Prof. Dr. Roniérik Pioli Vieira";

// Mapeamento exato (template A1:E18)
const ROTULO_CELLS = {
  departamento: "A3",
  laboratorio: "A4",
  responsavel: "A5",
  origemResiduo: "A6",
  dataPeriodo: "D3",
  ph: "D6",

  halogenadosFlag: "B9",
  acetonitrilaFlag: "B10",
  metaisPesadosFlag: "B11",
  enxofreFlag: "E9",
  cianetoFlag: "E10",
  aminasFlag: "E11",

  composicaoHalogenadosNome: "A13",
  composicaoAcetonitrilaNome: "A14",
  composicaoMetaisNome: "A15",
  composicaoExtraNome: "A16",
  composicaoExtraNome2: "A17",

  composicaoHalogenadosPct: "D13",
  composicaoAcetonitrilaPct: "D14",
  composicaoMetaisPct: "D15",
} as const;

function deepClone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value));
}

function withRowOffset(address: string, rowOffset: number): string {
  const decoded = XLSX.utils.decode_cell(address);
  return XLSX.utils.encode_cell({ r: decoded.r + rowOffset, c: decoded.c });
}

function copyTemplateSection(
  targetWs: XLSX.WorkSheet,
  templateWs: XLSX.WorkSheet,
  rowOffset: number,
  templateRange: XLSX.Range
): void {
  const templateRows = (templateWs["!rows"] || []) as any[];
  const targetRows = ((targetWs["!rows"] as any[]) || []) as any[];

  for (let r = templateRange.s.r; r <= templateRange.e.r; r += 1) {
    for (let c = templateRange.s.c; c <= templateRange.e.c; c += 1) {
      const sourceRef = XLSX.utils.encode_cell({ r, c });
      const targetRef = XLSX.utils.encode_cell({ r: r + rowOffset, c });
      const sourceCell = templateWs[sourceRef] as (XLSX.CellObject & { s?: any }) | undefined;
      if (!sourceCell) continue;
      targetWs[targetRef] = deepClone(sourceCell);
    }

    if (templateRows[r]) {
      targetRows[r + rowOffset] = deepClone(templateRows[r]);
    }
  }

  targetWs["!rows"] = targetRows;

  const templateMerges = (templateWs["!merges"] || []) as XLSX.Range[];
  const targetMerges = ((targetWs["!merges"] as XLSX.Range[]) || []) as XLSX.Range[];
  templateMerges.forEach((mergeRange) => {
    targetMerges.push({
      s: { r: mergeRange.s.r + rowOffset, c: mergeRange.s.c },
      e: { r: mergeRange.e.r + rowOffset, c: mergeRange.e.c },
    });
  });
  targetWs["!merges"] = targetMerges;
}

function setCellText(targetWs: XLSX.WorkSheet, address: string, value: string, rowOffset = 0): void {
  const cellRef = withRowOffset(address, rowOffset);
  const current = (targetWs[cellRef] as (XLSX.CellObject & { s?: any }) | undefined) || {};
  targetWs[cellRef] = {
    ...current,
    t: "s",
    v: value,
  };
}

function formatPercent(value: unknown): string {
  const numeric = asNumber(value);
  if (numeric === null) return "0%";
  return `${numeric}%`;
}

function asSimNao(value: unknown): string {
  return Boolean(value) ? "SIM" : "NÃO";
}

function asSimNaoFromPercent(value: unknown): string {
  const numeric = asNumber(value);
  return numeric !== null && numeric > 0 ? "SIM" : "NÃO";
}

function preencherCamposRotulo(targetWs: XLSX.WorkSheet, residuo: ResiduoDoc, rowOffset: number): void {
  const dataFormatada = residuo.data ? formatDatePtBR(residuo.data) : "-";
  const origem = asText(residuo.composicao);

  const composicaoPartes = String(residuo.composicao || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);

  setCellText(targetWs, ROTULO_CELLS.departamento, `Departamento: ${asText(residuo.departamento)}`, rowOffset);
  setCellText(targetWs, ROTULO_CELLS.laboratorio, `Laboratório: ${LABORATORIO_PADRAO}`, rowOffset);
  setCellText(
    targetWs,
    ROTULO_CELLS.responsavel,
    `Responsável pelas informações: ${asText(residuo.responsavel)}`,
    rowOffset
  );
  setCellText(targetWs, ROTULO_CELLS.origemResiduo, `Resíduo gerado na análise de: ${origem}`, rowOffset);
  setCellText(targetWs, ROTULO_CELLS.dataPeriodo, `Data ou período: ${dataFormatada}`, rowOffset);
  setCellText(targetWs, ROTULO_CELLS.ph, `pH= ${residuo.ph ?? "-"}`, rowOffset);

  setCellText(targetWs, ROTULO_CELLS.halogenadosFlag, asSimNaoFromPercent(residuo.halogenadosPercentual ?? residuo.halogenados), rowOffset);
  setCellText(targetWs, ROTULO_CELLS.acetonitrilaFlag, asSimNaoFromPercent(residuo.acetonitrilaPercentual ?? residuo.acetonitrila), rowOffset);
  setCellText(targetWs, ROTULO_CELLS.metaisPesadosFlag, asSimNaoFromPercent(residuo.metaisPesadosPercentual ?? residuo.metaisPesados), rowOffset);
  setCellText(targetWs, ROTULO_CELLS.enxofreFlag, asSimNao(residuo.presencaEnxofre ?? residuo.enxofre), rowOffset);
  setCellText(targetWs, ROTULO_CELLS.cianetoFlag, asSimNao(residuo.geradorCianetos ?? residuo.cianeto), rowOffset);
  setCellText(targetWs, ROTULO_CELLS.aminasFlag, asSimNao(residuo.aminas), rowOffset);

  setCellText(targetWs, ROTULO_CELLS.composicaoHalogenadosNome, "HALOGENADOS", rowOffset);
  setCellText(targetWs, ROTULO_CELLS.composicaoAcetonitrilaNome, "ACETONITRILA", rowOffset);
  setCellText(targetWs, ROTULO_CELLS.composicaoMetaisNome, "METAIS PESADOS", rowOffset);
  setCellText(targetWs, ROTULO_CELLS.composicaoHalogenadosPct, formatPercent(residuo.halogenadosPercentual ?? residuo.halogenados), rowOffset);
  setCellText(targetWs, ROTULO_CELLS.composicaoAcetonitrilaPct, formatPercent(residuo.acetonitrilaPercentual ?? residuo.acetonitrila), rowOffset);
  setCellText(targetWs, ROTULO_CELLS.composicaoMetaisPct, formatPercent(residuo.metaisPesadosPercentual ?? residuo.metaisPesados), rowOffset);

  setCellText(targetWs, ROTULO_CELLS.composicaoExtraNome, composicaoPartes[0] || "", rowOffset);
  setCellText(targetWs, ROTULO_CELLS.composicaoExtraNome2, composicaoPartes.slice(1).join(", "), rowOffset);
}

export async function gerarRotulosCampanha(residuos: ResiduoDoc[]): Promise<Buffer> {
  const templatePath = getTemplatePath("rotulo-campanha-template.xlsx");
  const templateBuffer = fs.readFileSync(templatePath);

  const templateWorkbook = XLSX.read(templateBuffer, {
    type: "buffer",
    cellStyles: true,
    cellNF: true,
    cellDates: true,
  });

  const templateWs = templateWorkbook.Sheets[templateWorkbook.SheetNames[0]] as XLSX.WorkSheet;
  const templateRange = XLSX.utils.decode_range(templateWs["!ref"] || "A1:E18");

  const outputWb = XLSX.utils.book_new();
  const labelsPerSheet = 2;
  const secondLabelOffset = 19;

  for (let i = 0; i < residuos.length; i += labelsPerSheet) {
    const ws = {} as XLSX.WorkSheet;

    ws["!cols"] = deepClone((templateWs["!cols"] || []) as any[]);

    if (residuos[i]) {
      copyTemplateSection(ws, templateWs, 0, templateRange);
      preencherCamposRotulo(ws, residuos[i], 0);
    }

    if (residuos[i + 1]) {
      copyTemplateSection(ws, templateWs, secondLabelOffset, templateRange);
      preencherCamposRotulo(ws, residuos[i + 1], secondLabelOffset);
    }

    const maxRow = residuos[i + 1] ? 37 : 18;
    ws["!ref"] = `A1:E${maxRow}`;

    if (templateWs["!margins"]) {
      ws["!margins"] = deepClone(templateWs["!margins"]);
    }

    ws["!pageSetup"] = {
      ...(deepClone((templateWs["!pageSetup"] || {}) as any) || {}),
      paperSize: 9,
      orientation: "portrait",
      fitToWidth: 1,
      fitToHeight: 0,
      scale: 100,
    } as any;

    XLSX.utils.book_append_sheet(outputWb, ws, `Folha ${Math.floor(i / labelsPerSheet) + 1}`);
  }

  const outputBuffer = XLSX.write(outputWb as any, {
    type: "buffer",
    bookType: "xlsx",
    cellStyles: true,
  });

  return Buffer.from(outputBuffer);
}
