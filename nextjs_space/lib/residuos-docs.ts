import { PDFDocument, rgb, StandardFonts, degrees } from "pdf-lib";
import * as XLSX from "xlsx";
import * as fs from "fs";
import * as path from "path";
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

// Dependência xlsx-style instalada para compatibilidade com ambientes legados.

/**
 * Sanitize text for PDF Standard Fonts (WinAnsi encoding).
 * Replaces characters outside WinAnsi with ASCII equivalents or removes them.
 */
function sanitizeForPdf(text: string): string {
  if (!text) return text;
  return text
    .replace(/⚠️?/g, "/!\\")   // warning sign
    .replace(/△/g, "/!\\")      // triangle
    .replace(/—/g, "-")          // em dash
    .replace(/–/g, "-")          // en dash
    .replace(/'/g, "'")          // smart quote left
    .replace(/'/g, "'")          // smart quote right
    .replace(/"/g, '"')          // smart double quote left
    .replace(/"/g, '"')          // smart double quote right
    .replace(/…/g, "...")        // ellipsis
    .replace(/•/g, "-")          // bullet
    .replace(/[^\x00-\xFF]/g, ""); // remove any remaining non-WinAnsi chars
}

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
    page.drawText(sanitizeForPdf(value) || "-", {
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

export async function gerarRotulosCampanha(residuos: any[]): Promise<Buffer> {
  const sections: any[] = [];

  // Processar 2 rótulos por página
  for (let i = 0; i < residuos.length; i += 2) {
    const children: any[] = [];

    // Rótulo 1
    children.push(criarRotuloTemplate(residuos[i]));

    // Espaço pequeno entre rótulos
    children.push(new Paragraph({ spacing: { before: 100, after: 100 } }));

    // Rótulo 2 (se existir)
    if (residuos[i + 1]) {
      children.push(criarRotuloTemplate(residuos[i + 1]));
    }

    // Quebra de página após cada par
    if (i + 2 < residuos.length) {
      children.push(new Paragraph({ children: [new PageBreak()] }));
    }

    sections.push({
      properties: {
        page: {
          size: { width: 11906, height: 16838 }, // A4
          margin: { top: 567, right: 567, bottom: 567, left: 567 }, // ~1cm
        },
      },
      children,
    });
  }

  const doc = new Document({ sections });
  return await Packer.toBuffer(doc);
}

function toBoolean(value: unknown): boolean {
  if (typeof value === "boolean") return value;
  if (typeof value === "number") return value > 0;
  const normalized = String(value ?? "")
    .trim()
    .toLowerCase();
  return ["true", "1", "sim", "yes", "y"].includes(normalized);
}

function formatDateSafe(value: unknown): string {
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(String(value));
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString("pt-BR");
}

function criarRotuloTemplate(residuo: any): Table {
  const borderStyle = {
    top: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
    bottom: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
    left: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
    right: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
  };

  return new Table({
    width: { size: 100, type: WidthType.PERCENTAGE },
    borders: {
      top: borderStyle.top,
      bottom: borderStyle.bottom,
      left: borderStyle.left,
      right: borderStyle.right,
      insideHorizontal: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
      insideVertical: { style: BorderStyle.SINGLE, size: 6, color: "000000" },
    },
    rows: [
      // Linha 1: Cabeçalho FEQ/UNICAMP
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: "FEQ/UNICAMP", bold: true, size: 18 })],
                alignment: AlignmentType.CENTER,
              }),
            ],
            columnSpan: 5,
          }),
        ],
      }),

      // Linha 2: Departamento
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: "Departamento:", bold: true, size: 18 })],
              }),
            ],
            columnSpan: 5,
          }),
        ],
      }),

      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: residuo.departamento || "", size: 18 })],
              }),
            ],
            columnSpan: 5,
          }),
        ],
      }),

      // Linha 3: Laboratório/Responsável
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: "Laboratório/ Responsável:", bold: true, size: 18 }),
                ],
              }),
            ],
            columnSpan: 5,
          }),
        ],
      }),

      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: "LERP / Prof. Dr. Roniérik Pioli Vieira", size: 18 })],
              }),
            ],
            columnSpan: 5,
          }),
        ],
      }),

      // Linha 4: Responsável pelas informações
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: "Responsável pelas informações:", bold: true, size: 18 })],
              }),
            ],
            columnSpan: 5,
          }),
        ],
      }),

      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: residuo.responsavel || "", size: 18 })],
              }),
            ],
            columnSpan: 3,
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: "Data/Período:", bold: true, size: 16 })],
              }),
            ],
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: formatDateSafe(residuo.data), size: 16 })],
              }),
            ],
          }),
        ],
      }),

      // Linha 5: Origem do resíduo/Descrição da análise
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Origem do resíduo/Descrição da análise:",
                    bold: true,
                    size: 18,
                  }),
                ],
              }),
            ],
            columnSpan: 5,
          }),
        ],
      }),

      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: residuo.composicao || "", size: 18 })],
              }),
            ],
            columnSpan: 5,
          }),
        ],
      }),

      // Classe do resíduo
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Classe do Resíduo: (Ex.: Hidrocarbonetos-HC, Organoalogenados-OH, Compostos Nitrogenados-CN, Compostos Sulfurados-CS, Organofosforados-OF, Organometálicos-OM)",
                    bold: true,
                    size: 16,
                  }),
                ],
              }),
            ],
            columnSpan: 3,
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: "Sólido (S) ou Líquido (L)", bold: true, size: 16 })],
                alignment: AlignmentType.CENTER,
              }),
            ],
            columnSpan: 2,
          }),
        ],
      }),

      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: residuo.classe || "", size: 20, bold: true })],
              }),
            ],
            columnSpan: 3,
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: residuo.estado || "", size: 20, bold: true })],
                alignment: AlignmentType.CENTER,
              }),
            ],
            columnSpan: 2,
          }),
        ],
      }),

      // Recipiente de armazenamento
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Recipiente de armazenamento (Ex.: bombona certificada, frasco de vidro, frasco plástico)",
                    bold: true,
                    size: 16,
                  }),
                ],
              }),
            ],
            columnSpan: 2,
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: "Volume do resíduo (L)", bold: true, size: 16 })],
                alignment: AlignmentType.CENTER,
              }),
            ],
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: "Volume do recipiente (L)", bold: true, size: 16 })],
                alignment: AlignmentType.CENTER,
              }),
            ],
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: "pH", bold: true, size: 16 })],
                alignment: AlignmentType.CENTER,
              }),
            ],
          }),
        ],
      }),

      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: residuo.tipoRecipiente || "", size: 18 })],
              }),
            ],
            columnSpan: 2,
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: String(residuo.volumeAtual ?? residuo.volume ?? ""), size: 18 })],
                alignment: AlignmentType.CENTER,
              }),
            ],
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: String(residuo.volumeRecipiente ?? ""), size: 18 })],
                alignment: AlignmentType.CENTER,
              }),
            ],
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: String(residuo.ph ?? ""), size: 18 })],
                alignment: AlignmentType.CENTER,
              }),
            ],
          }),
        ],
      }),

      // Checkboxes - Preenchimento Obrigatório
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: "Preenchimento Obrigatório (Assinale SIM ou NÃO)",
                    bold: true,
                    size: 16,
                  }),
                ],
              }),
            ],
            columnSpan: 5,
            shading: { fill: "D9D9D9" },
          }),
        ],
      }),

      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "Halogenados", bold: true, size: 14 })] })],
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: (asNumber(residuo.halogenados) ?? 0) > 0 ? "SIM" : "NÃO", size: 14 })],
                alignment: AlignmentType.CENTER,
              }),
            ],
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: "Enxofre ou Sulfurados", bold: true, size: 14 })],
              }),
            ],
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: toBoolean(residuo.enxofre ?? residuo.presencaEnxofre) ? "SIM" : "NÃO", size: 14 }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
            columnSpan: 2,
          }),
        ],
      }),

      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "Acetonitrila", bold: true, size: 14 })] })],
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: (asNumber(residuo.acetonitrila) ?? 0) > 0 ? "SIM" : "NÃO", size: 14 })],
                alignment: AlignmentType.CENTER,
              }),
            ],
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: "Cianetos ou Gerador de cianetos", bold: true, size: 14 })],
              }),
            ],
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({ text: toBoolean(residuo.cianeto ?? residuo.geradorCianetos) ? "SIM" : "NÃO", size: 14 }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
            columnSpan: 2,
          }),
        ],
      }),

      new TableRow({
        children: [
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "Metais Pesados", bold: true, size: 14 })] })],
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: (asNumber(residuo.metaisPesados) ?? 0) > 0 ? "SIM" : "NÃO", size: 14 })],
                alignment: AlignmentType.CENTER,
              }),
            ],
          }),
          new TableCell({
            children: [new Paragraph({ children: [new TextRun({ text: "Aminas", bold: true, size: 14 })] })],
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: toBoolean(residuo.aminas) ? "SIM" : "NÃO", size: 14 })],
                alignment: AlignmentType.CENTER,
              }),
            ],
            columnSpan: 2,
          }),
        ],
      }),

      // Tabela de composição
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: "Compostos (Inclusive água)", bold: true, size: 14 })],
                alignment: AlignmentType.CENTER,
              }),
            ],
            columnSpan: 4,
          }),
          new TableCell({
            children: [
              new Paragraph({
                children: [new TextRun({ text: "Porcentagem no Resíduo", bold: true, size: 14 })],
                alignment: AlignmentType.CENTER,
              }),
            ],
          }),
        ],
      }),

      // 4 linhas para composição
      ...criarLinhasComposicao(residuo),

      // Linha final: Aviso
      new TableRow({
        children: [
          new TableCell({
            children: [
              new Paragraph({
                children: [
                  new TextRun({
                    text: "ATENÇÃO: Utilize apenas 75% do volume do frasco",
                    bold: true,
                    size: 20,
                    color: "FF0000",
                  }),
                ],
                alignment: AlignmentType.CENTER,
              }),
            ],
            columnSpan: 5,
            shading: { fill: "FFFF00" },
          }),
        ],
      }),
    ],
  });
}

function criarLinhasComposicao(residuo: any): TableRow[] {
  const linhas: TableRow[] = [];

  // Linha 1: Halogenados
  linhas.push(
    new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: "Halogenados", size: 14 })] })],
          columnSpan: 4,
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ text: `${asNumber(residuo.halogenados) ?? 0}%`, size: 14 })],
              alignment: AlignmentType.CENTER,
            }),
          ],
        }),
      ],
    })
  );

  // Linha 2: Acetonitrila
  linhas.push(
    new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: "Acetonitrila", size: 14 })] })],
          columnSpan: 4,
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ text: `${asNumber(residuo.acetonitrila) ?? 0}%`, size: 14 })],
              alignment: AlignmentType.CENTER,
            }),
          ],
        }),
      ],
    })
  );

  // Linha 3: Metais Pesados
  linhas.push(
    new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: "Metais Pesados", size: 14 })] })],
          columnSpan: 4,
        }),
        new TableCell({
          children: [
            new Paragraph({
              children: [new TextRun({ text: `${asNumber(residuo.metaisPesados) ?? 0}%`, size: 14 })],
              alignment: AlignmentType.CENTER,
            }),
          ],
        }),
      ],
    })
  );

  // Linha 4: Outros
  linhas.push(
    new TableRow({
      children: [
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: "Outros", size: 14 })] })],
          columnSpan: 4,
        }),
        new TableCell({
          children: [new Paragraph({ children: [new TextRun({ text: "", size: 14 })] })],
        }),
      ],
    })
  );

  return linhas;
}
