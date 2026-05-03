import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";
import { createReport } from "docx-templates";
import { PDFDocument, StandardFonts, degrees, rgb, type PDFPage } from "pdf-lib";
import { CLASSE_RESIDUO_LABEL } from "@/lib/residuos";

type ClasseResiduo = keyof typeof CLASSE_RESIDUO_LABEL;

type ResiduoDoc = {
  id?: string;
  numeroRecipiente?: number;
  numeroOrdinal?: number;
  composicao: string;
  classe: ClasseResiduo;
  estado: "S" | "L";
  tipoRecipiente: string;
  volumeRecipienteLitros: number;
  volumeAtualLitros?: number | null;
  responsavel: string;
  departamento: string;
  data: Date | string;
  ph?: number | null;
  observacoes?: string | null;
  halogenadosPercentual?: number | null;
  acetonitrilaPercentual?: number | null;
  metaisPesadosPercentual?: number | null;
  presencaEnxofre?: boolean;
  geradorCianetos?: boolean;
  aminas?: boolean;
};

type MetadadosCampanha = {
  departamento?: string;
  responsavelInformacoes?: string;
  data?: Date | string;
};

const TEMPLATE_FILE_NAMES = {
  planilha: "Planilha campanha.xlsx",
  rotulo: "rotulo campanha.docx",
} as const;

function resolveTemplatePath(fileName: string): string {
  const candidates = [
    path.join(process.cwd(), "templates", "residuos", fileName),
    path.join(process.cwd(), "nextjs_space", "templates", "residuos", fileName),
    path.join(process.cwd(), "..", "templates", "residuos", fileName),
    path.join("/home/ubuntu/Uploads", fileName),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }

  throw new Error(`Template não encontrado: ${fileName}`);
}

function formatDatePtBr(value?: Date | string | null): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("pt-BR").format(date);
}

function toPercent(value?: number | null): string {
  if (value === null || value === undefined || Number.isNaN(Number(value))) return "0";
  return Number(value).toLocaleString("pt-BR", { maximumFractionDigits: 2 });
}

function boolMark(value?: boolean): string {
  return value ? "[X]" : "[ ]";
}

function boolText(value?: boolean): string {
  return value ? "SIM" : "NAO";
}

function drawField(
  page: PDFPage,
  font: any,
  label: string,
  value: string,
  x: number,
  y: number,
  width: number,
  height = 32
) {
  page.drawRectangle({ x, y, width, height, borderColor: rgb(0.65, 0.65, 0.65), borderWidth: 0.8 });
  page.drawText(label, { x: x + 6, y: y + height - 12, size: 8, font, color: rgb(0.2, 0.2, 0.2) });
  page.drawText(value || "-", { x: x + 6, y: y + 8, size: 10, font, color: rgb(0.05, 0.05, 0.05), maxWidth: width - 12 });
}

export async function gerarEtiquetaInterna(residuo: ResiduoDoc): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]); // A4
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const { width, height } = page.getSize();
  const margin = 26;
  const usableWidth = width - margin * 2;

  page.drawRectangle({ x: margin, y: margin, width: usableWidth, height: height - margin * 2, borderWidth: 1.4, borderColor: rgb(0.2, 0.2, 0.2) });

  page.drawText("RESIDUO", {
    x: 145,
    y: 410,
    size: 92,
    font: bold,
    color: rgb(0.95, 0.78, 0.2),
    opacity: 0.1,
    rotate: degrees(24),
  });

  page.drawRectangle({ x: margin + 1, y: height - 100, width: usableWidth - 2, height: 64, color: rgb(0.97, 0.97, 0.97), borderWidth: 1, borderColor: rgb(0.6, 0.6, 0.6) });
  page.drawText("RESIDUO QUIMICO", { x: margin + 14, y: height - 68, size: 25, font: bold, color: rgb(0.12, 0.12, 0.12) });
  page.drawText("FACULDADE DE ENGENHARIA QUIMICA - FEQ / UNICAMP", {
    x: margin + 14,
    y: height - 85,
    size: 9,
    font,
    color: rgb(0.35, 0.35, 0.35),
  });

  const numeroEtiqueta = residuo.numeroRecipiente ?? residuo.numeroOrdinal ?? 0;

  const colGap = 10;
  const colW = (usableWidth - colGap) / 2;
  let y = height - 150;

  drawField(page, font, "N° RECIPIENTE", String(numeroEtiqueta || "-"), margin, y, colW, 34);
  drawField(page, font, "DATA", formatDatePtBr(residuo.data), margin + colW + colGap, y, colW, 34);

  y -= 40;
  drawField(page, font, "DEPARTAMENTO", residuo.departamento || "-", margin, y, colW, 34);
  drawField(page, font, "RESPONSAVEL", residuo.responsavel || "-", margin + colW + colGap, y, colW, 34);

  y -= 40;
  drawField(page, font, "CLASSE", CLASSE_RESIDUO_LABEL[residuo.classe] || residuo.classe || "-", margin, y, colW, 34);
  drawField(page, font, "ESTADO / pH", `${residuo.estado === "S" ? "SOLIDO" : "LIQUIDO"}  |  pH: ${residuo.ph ?? "-"}`, margin + colW + colGap, y, colW, 34);

  y -= 40;
  drawField(page, font, "TIPO DO RECIPIENTE", residuo.tipoRecipiente || "-", margin, y, colW, 34);
  drawField(
    page,
    font,
    "VOLUME",
    `Atual: ${residuo.volumeAtualLitros ?? 0} L  |  Recipiente: ${residuo.volumeRecipienteLitros ?? 0} L`,
    margin + colW + colGap,
    y,
    colW,
    34
  );

  y -= 54;
  page.drawRectangle({ x: margin, y: y - 50, width: usableWidth, height: 52, borderWidth: 1, borderColor: rgb(0.6, 0.6, 0.6) });
  page.drawText("COMPOSICAO", { x: margin + 8, y: y - 10, size: 9, font: bold });
  page.drawText(residuo.composicao || "-", { x: margin + 8, y: y - 28, size: 10, font, maxWidth: usableWidth - 16 });

  y -= 74;
  page.drawRectangle({ x: margin, y: y - 66, width: usableWidth, height: 68, borderWidth: 1, borderColor: rgb(0.6, 0.6, 0.6) });
  page.drawText("CHECKS DE SEGURANCA", { x: margin + 8, y: y - 12, size: 9, font: bold });
  page.drawText(`${boolMark(residuo.presencaEnxofre)} Enxofre/substancias sulfuradas: ${boolText(residuo.presencaEnxofre)}`, { x: margin + 8, y: y - 28, size: 9, font });
  page.drawText(`${boolMark(residuo.geradorCianetos)} Gerador de cianetos: ${boolText(residuo.geradorCianetos)}`, { x: margin + 8, y: y - 41, size: 9, font });
  page.drawText(`${boolMark(residuo.aminas)} Aminas: ${boolText(residuo.aminas)}`, { x: margin + 8, y: y - 54, size: 9, font });

  y -= 86;
  const tableY = y - 86;
  page.drawRectangle({ x: margin, y: tableY, width: usableWidth, height: 88, borderWidth: 1, borderColor: rgb(0.5, 0.5, 0.5) });
  page.drawLine({ start: { x: margin + usableWidth * 0.7, y: tableY }, end: { x: margin + usableWidth * 0.7, y: tableY + 88 }, thickness: 1, color: rgb(0.6, 0.6, 0.6) });
  [1, 2, 3].forEach((idx) => {
    const rowY = tableY + 88 - idx * 22;
    page.drawLine({ start: { x: margin, y: rowY }, end: { x: margin + usableWidth, y: rowY }, thickness: 0.7, color: rgb(0.75, 0.75, 0.75) });
  });
  page.drawText("COMPOSTO", { x: margin + 8, y: tableY + 72, size: 9, font: bold });
  page.drawText("% NO RESIDUO", { x: margin + usableWidth * 0.7 + 8, y: tableY + 72, size: 9, font: bold });

  const rows = [
    ["Halogenados", `${toPercent(residuo.halogenadosPercentual)}%`],
    ["Acetonitrila", `${toPercent(residuo.acetonitrilaPercentual)}%`],
    ["Metais pesados", `${toPercent(residuo.metaisPesadosPercentual)}%`],
  ];
  rows.forEach((row, idx) => {
    page.drawText(row[0], { x: margin + 8, y: tableY + 52 - idx * 22, size: 10, font });
    page.drawText(row[1], { x: margin + usableWidth * 0.7 + 8, y: tableY + 52 - idx * 22, size: 10, font });
  });

  page.drawRectangle({ x: margin + 1, y: margin + 8, width: usableWidth - 2, height: 34, color: rgb(1, 0.95, 0.85), borderWidth: 1, borderColor: rgb(0.85, 0.63, 0.2) });
  page.drawText("ATENCAO: Utilize apenas 75% do volume do frasco", { x: margin + 12, y: margin + 20, size: 11, font: bold, color: rgb(0.65, 0.22, 0.1) });

  return Buffer.from(await pdfDoc.save());
}

function setSheetValue(
  ws: XLSX.WorkSheet,
  cellAddress: string,
  value: string | number,
  type?: "s" | "n"
) {
  const current = ws[cellAddress] || {};
  ws[cellAddress] = {
    ...current,
    t: type || (typeof value === "number" ? "n" : "s"),
    v: value,
    w: undefined,
  } as XLSX.CellObject;
}

export function gerarPlanilhaCampanha(residuos: ResiduoDoc[], metadados?: MetadadosCampanha): Buffer {
  const templatePath = resolveTemplatePath(TEMPLATE_FILE_NAMES.planilha);
  const binaryTemplate = fs.readFileSync(templatePath);

  const workbook = XLSX.read(binaryTemplate, {
    type: "buffer",
    cellStyles: true,
    cellDates: true,
  });

  const sheetName = workbook.SheetNames[0];
  const ws = workbook.Sheets[sheetName];

  const departamento = metadados?.departamento || residuos[0]?.departamento || "";
  const responsavel = metadados?.responsavelInformacoes || residuos[0]?.responsavel || "";
  const data = formatDatePtBr(metadados?.data || new Date());

  setSheetValue(ws, "A1", `Laboratório/  Responsável: ${responsavel}`);
  setSheetValue(ws, "A2", `Departamento: ${departamento}`);
  setSheetValue(ws, "A3", `Responsável pelas  Informações: ${responsavel}`);
  setSheetValue(ws, "E3", `Data: ${data}`);

  const startRow = 5;
  residuos.forEach((residuo, index) => {
    const row = startRow + index;
    const ordinal = residuo.numeroOrdinal ?? index + 1;
    setSheetValue(ws, `A${row}`, ordinal, "n");
    setSheetValue(ws, `B${row}`, residuo.composicao || "-");
    setSheetValue(ws, `C${row}`, CLASSE_RESIDUO_LABEL[residuo.classe] || residuo.classe || "-");
    setSheetValue(ws, `D${row}`, residuo.estado === "S" ? "S" : "L");
    setSheetValue(ws, `E${row}`, residuo.tipoRecipiente || "-");
    setSheetValue(ws, `F${row}`, Number(residuo.volumeAtualLitros ?? 0), "n");
    setSheetValue(ws, `G${row}`, Number(residuo.volumeRecipienteLitros ?? 0), "n");
  });

  const lastUsedRow = Math.max(17, startRow + residuos.length - 1);
  ws["!ref"] = `A1:G${lastUsedRow}`;

  const output = XLSX.write(workbook, {
    type: "buffer",
    bookType: "xlsx",
    cellStyles: true,
  });

  return Buffer.isBuffer(output) ? output : Buffer.from(output);
}

async function tentarGerarDocxComTemplate(residuos: ResiduoDoc[]): Promise<Buffer | null> {
  const templatePath = resolveTemplatePath(TEMPLATE_FILE_NAMES.rotulo);
  const templateBuffer = fs.readFileSync(templatePath);

  const zipText = templateBuffer.toString("utf8");
  const possivelPlaceholder = /\{[A-Z0-9_]+\}|\[\[[A-Z0-9_]+\]\]|\$\{[A-Z0-9_]+\}|\+\+\+/i.test(zipText);
  if (!possivelPlaceholder) return null;

  const report = await createReport({
    template: templateBuffer,
    data: {
      residuos: residuos.map((r, i) => ({
        numeroOrdinal: r.numeroOrdinal ?? i + 1,
        numeroRecipiente: r.numeroRecipiente ?? "",
        composicao: r.composicao || "",
        classe: CLASSE_RESIDUO_LABEL[r.classe] || r.classe,
        estado: r.estado,
        tipoRecipiente: r.tipoRecipiente || "",
        volumeAtualLitros: r.volumeAtualLitros ?? 0,
        volumeRecipienteLitros: r.volumeRecipienteLitros ?? 0,
        responsavel: r.responsavel || "",
        departamento: r.departamento || "",
        data: formatDatePtBr(r.data),
        ph: r.ph ?? "-",
        halogenadosPercentual: toPercent(r.halogenadosPercentual),
        acetonitrilaPercentual: toPercent(r.acetonitrilaPercentual),
        metaisPesadosPercentual: toPercent(r.metaisPesadosPercentual),
        presencaEnxofre: boolText(r.presencaEnxofre),
        geradorCianetos: boolText(r.geradorCianetos),
        aminas: boolText(r.aminas),
      })),
    },
    cmdDelimiter: ["{{", "}}"],
    failFast: false,
    noSandbox: true,
  });

  return Buffer.from(report);
}

async function gerarRotulosPdfFallback(residuos: ResiduoDoc[]): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const bold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  residuos.forEach((residuo, index) => {
    const page = pdfDoc.addPage([595.28, 841.89]);
    const ordinal = residuo.numeroOrdinal ?? index + 1;

    page.drawText(`ROTULO DE CAMPANHA  #${ordinal}`, { x: 40, y: 804, size: 18, font: bold });
    page.drawText(`N° recipiente: ${residuo.numeroRecipiente ?? "-"}`, { x: 420, y: 804, size: 10, font });

    page.drawRectangle({ x: 35, y: 40, width: 525, height: 742, borderWidth: 1.2, borderColor: rgb(0.2, 0.2, 0.2) });

    const lines = [
      ["Data", formatDatePtBr(residuo.data)],
      ["Departamento", residuo.departamento],
      ["Responsável", residuo.responsavel],
      ["Composição", residuo.composicao],
      ["Classe", CLASSE_RESIDUO_LABEL[residuo.classe] || residuo.classe],
      ["Estado", residuo.estado === "S" ? "SOLIDO" : "LIQUIDO"],
      ["Tipo recipiente", residuo.tipoRecipiente],
      ["Volume atual (L)", String(residuo.volumeAtualLitros ?? 0)],
      ["Volume recipiente (L)", String(residuo.volumeRecipienteLitros ?? 0)],
      ["pH", String(residuo.ph ?? "-")],
      ["Enxofre", boolText(residuo.presencaEnxofre)],
      ["Cianetos", boolText(residuo.geradorCianetos)],
      ["Aminas", boolText(residuo.aminas)],
      ["Halogenados (%)", `${toPercent(residuo.halogenadosPercentual)}%`],
      ["Acetonitrila (%)", `${toPercent(residuo.acetonitrilaPercentual)}%`],
      ["Metais pesados (%)", `${toPercent(residuo.metaisPesadosPercentual)}%`],
    ];

    let y = 760;
    lines.forEach(([k, v]) => {
      page.drawText(String(k), { x: 50, y, size: 9, font: bold, color: rgb(0.25, 0.25, 0.25) });
      page.drawText(String(v || "-"), { x: 220, y, size: 10, font, maxWidth: 320 });
      y -= 40;
    });
  });

  return Buffer.from(await pdfDoc.save());
}

export async function gerarRotulosCampanha(residuos: ResiduoDoc[]): Promise<Buffer> {
  try {
    const docxBuffer = await tentarGerarDocxComTemplate(residuos);
    if (docxBuffer) return docxBuffer;
  } catch (error) {
    console.warn("[residuos-docs] Falha ao preencher DOCX por template, aplicando fallback para PDF", error);
  }

  return gerarRotulosPdfFallback(residuos);
}

export function ensureTemplateExists() {
  resolveTemplatePath(TEMPLATE_FILE_NAMES.planilha);
  resolveTemplatePath(TEMPLATE_FILE_NAMES.rotulo);
}
