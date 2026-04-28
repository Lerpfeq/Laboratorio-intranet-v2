import fs from "fs";
import path from "path";
import * as XLSX from "xlsx";
import { PDFDocument, rgb, StandardFonts, degrees } from "pdf-lib";
import { CLASSE_RESIDUO_LABEL } from "@/lib/residuos";

type ResiduoDoc = {
  id: string;
  numeroRecipiente: number;
  composicao: string;
  classe: keyof typeof CLASSE_RESIDUO_LABEL;
  estado: "S" | "L";
  tipoRecipiente: string;
  volumeRecipienteLitros: number;
  volumeAtualLitros?: number | null;
  responsavel: string;
  departamento: string;
  data: Date;
  ph?: number | null;
  observacoes?: string | null;
  halogenadosPercentual?: number | null;
  acetonitrilaPercentual?: number | null;
  metaisPesadosPercentual?: number | null;
  presencaEnxofre: boolean;
  geradorCianetos: boolean;
  aminas: boolean;
};

const TEMPLATE_PLANILHA_PATH = path.join(process.cwd(), "templates", "residuos", "planilha-modelo.xls");

function formatDatePtBr(date: Date): string {
  return new Intl.DateTimeFormat("pt-BR").format(date);
}

function drawLabel(
  page: any,
  residuo: ResiduoDoc,
  options: { watermark?: string; ordinal?: number }
) {
  const { watermark, ordinal } = options;
  const { width, height } = page.getSize();
  const margin = 24;

  page.drawRectangle({
    x: margin,
    y: margin,
    width: width - margin * 2,
    height: height - margin * 2,
    borderWidth: 1.2,
    borderColor: rgb(0.2, 0.2, 0.2),
  });

  if (watermark) {
    page.drawText(watermark, {
      x: width / 2 - 120,
      y: height / 2 - 20,
      size: 48,
      color: rgb(0.86, 0.86, 0.86),
      rotate: degrees(28),
      opacity: 0.5,
    });
  }

  const headerY = height - 52;
  page.drawText("RESÍDUO QUÍMICO", { x: margin + 14, y: headerY, size: 24 });
  page.drawText("FACULDADE DE ENGENHARIA QUÍMICA - FEQ / UNICAMP", {
    x: margin + 14,
    y: headerY - 16,
    size: 9,
    color: rgb(0.25, 0.25, 0.25),
  });

  page.drawText("⚠", { x: width - 56, y: headerY - 4, size: 24, color: rgb(0.65, 0.1, 0.1) });

  const contentX = margin + 12;
  let y = height - 96;
  const lineGap = 15;

  const lines = [
    `Nº recipiente: ${ordinal ?? residuo.numeroRecipiente}`,
    `Departamento: ${residuo.departamento}`,
    `Laboratório: ${residuo.departamento}`,
    `Responsável pelas informações: ${residuo.responsavel}`,
    `Data de geração: ${formatDatePtBr(new Date())}   pH: ${residuo.ph ?? "-"}`,
  ];

  lines.forEach((line) => {
    page.drawText(line, { x: contentX, y, size: 10 });
    y -= lineGap;
  });

  page.drawRectangle({
    x: contentX,
    y: y - 70,
    width: width - (margin + 12) * 2,
    height: 78,
    borderWidth: 1,
    borderColor: rgb(0.2, 0.2, 0.2),
  });

  page.drawText("PREENCHIMENTO OBRIGATÓRIO", {
    x: contentX + 8,
    y: y - 12,
    size: 10,
    color: rgb(0.2, 0.2, 0.2),
  });

  page.drawText(`O RESÍDUO CONTÉM (marcar SIM ou NÃO para cada item):`, {
    x: contentX + 8,
    y: y - 26,
    size: 9,
  });

  const boolToMark = (v: boolean) => (v ? "SIM" : "NÃO");

  page.drawText(`Presença de enxofre/substâncias sulfuradas: ${boolToMark(residuo.presencaEnxofre)}`, {
    x: contentX + 10,
    y: y - 41,
    size: 9,
  });
  page.drawText(`Gerador de cianetos: ${boolToMark(residuo.geradorCianetos)}`, {
    x: contentX + 10,
    y: y - 54,
    size: 9,
  });
  page.drawText(`Aminas: ${boolToMark(residuo.aminas)}`, {
    x: contentX + 10,
    y: y - 67,
    size: 9,
  });

  y -= 84;

  page.drawRectangle({
    x: contentX,
    y: y - 95,
    width: width - (margin + 12) * 2,
    height: 105,
    borderWidth: 1,
    borderColor: rgb(0.2, 0.2, 0.2),
  });

  page.drawText("COMPOSTOS (inclusive água)", { x: contentX + 8, y: y - 12, size: 10 });
  page.drawText("PORCENTAGEM NO RESÍDUO", {
    x: width - 220,
    y: y - 12,
    size: 10,
  });

  const compRows = [
    ["Halogenados", `${residuo.halogenadosPercentual ?? 0}%`],
    ["Acetonitrila", `${residuo.acetonitrilaPercentual ?? 0}%`],
    ["Metais pesados", `${residuo.metaisPesadosPercentual ?? 0}%`],
    ["Classe", CLASSE_RESIDUO_LABEL[residuo.classe]],
    ["Estado", residuo.estado === "S" ? "Sólido" : "Líquido"],
    ["Tipo de recipiente", residuo.tipoRecipiente],
    ["Volume do recipiente", `${residuo.volumeRecipienteLitros} L`],
  ];

  let rowY = y - 26;
  for (const [left, right] of compRows) {
    page.drawText(String(left), { x: contentX + 10, y: rowY, size: 9 });
    page.drawText(String(right), { x: width - 210, y: rowY, size: 9 });
    rowY -= 12;
  }

  page.drawText(`Composição textual: ${residuo.composicao}`, {
    x: contentX + 10,
    y: y - 110,
    size: 8,
    maxWidth: width - 90,
  });

  page.drawText("ATENÇÃO: Utilize apenas 75% do volume do frasco", {
    x: contentX + 8,
    y: margin + 8,
    size: 10,
    color: rgb(0.65, 0.1, 0.1),
  });
}

export async function generateEtiquetaResiduoPdf(
  residuo: ResiduoDoc,
  options: { watermark?: string; ordinal?: number } = {}
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595, 842]);
  await pdfDoc.embedFont(StandardFonts.Helvetica);
  drawLabel(page, residuo, options);
  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
}

export async function generateEtiquetasCampanhaPdf(
  residuos: Array<{ ordinal: number; residuo: ResiduoDoc }>
): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  await pdfDoc.embedFont(StandardFonts.Helvetica);

  for (const item of residuos) {
    const page = pdfDoc.addPage([595, 842]);
    drawLabel(page, item.residuo, { ordinal: item.ordinal });
  }

  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
}

export function generateCampanhaExcel(params: {
  residuos: Array<{ ordinal: number; residuo: ResiduoDoc }>;
  departamento?: string;
  responsavelInformacoes?: string;
  data?: Date;
}): Buffer {
  const { residuos, departamento, responsavelInformacoes, data } = params;

  const workbook = XLSX.readFile(TEMPLATE_PLANILHA_PATH, {
    cellStyles: true,
    cellDates: true,
  });
  const sheetName = workbook.SheetNames[0] || "Plan1";
  const ws = workbook.Sheets[sheetName];

  const campaignDate = data ?? new Date();
  ws["A2"] = { t: "s", v: `Departamento: ${departamento || "DemBio"}` };
  ws["A3"] = {
    t: "s",
    v: `Responsável pelas Informações: ${responsavelInformacoes || "Não informado"}`,
  };
  ws["E3"] = { t: "s", v: `Data:${formatDatePtBr(campaignDate)}` };

  const startRow = 5;
  residuos.forEach((item, index) => {
    const row = startRow + index;
    const volumeAtual = item.residuo.volumeAtualLitros ?? 0;

    ws[`A${row}`] = { t: "n", v: item.ordinal };
    ws[`B${row}`] = { t: "s", v: item.residuo.composicao };
    ws[`C${row}`] = { t: "s", v: CLASSE_RESIDUO_LABEL[item.residuo.classe] };
    ws[`D${row}`] = { t: "s", v: item.residuo.estado };
    ws[`E${row}`] = { t: "s", v: item.residuo.tipoRecipiente };
    ws[`F${row}`] = { t: "s", v: `${volumeAtual}L` };
    ws[`G${row}`] = { t: "s", v: `${item.residuo.volumeRecipienteLitros}L` };
  });

  const maxRow = Math.max(startRow + residuos.length, 66);
  ws["!ref"] = `A1:G${maxRow}`;

  const output = XLSX.write(workbook, {
    type: "buffer",
    bookType: "xls",
  });

  return Buffer.isBuffer(output) ? output : Buffer.from(output);
}

export function ensureTemplateExists() {
  if (!fs.existsSync(TEMPLATE_PLANILHA_PATH)) {
    throw new Error(`Template de planilha não encontrado em ${TEMPLATE_PLANILHA_PATH}`);
  }
}
