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

// xlsx-style dependency installed for legacy environment compatibility.

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
    `Template not found: ${filename}. Searched in: ${candidates.join(", ")}`
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

async function loadLogoBytes(): Promise<Uint8Array | null> {
  try {
    const logoPath = path.join(process.cwd(), "public", "logo.png");
    return fs.readFileSync(logoPath);
  } catch {
    return null;
  }
}

export async function gerarEtiquetaInterna(residuo: ResiduoDoc): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();

  // Same dimensions as reagent label: 12cm x 5cm ~= 340 x 142 pt
  const page = pdfDoc.addPage([340, 142]);

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = page.getWidth();
  const pageHeight = page.getHeight();

  // ── Outer border ──
  page.drawRectangle({
    x: 1,
    y: 1,
    width: pageWidth - 2,
    height: pageHeight - 2,
    borderWidth: 1.5,
    borderColor: rgb(0.17, 0.24, 0.32),
    color: rgb(1, 1, 1),
  });

  // ── Yellow "WASTE" watermark (diagonal, always shown) ──
  const wmText = "WASTE";
  const wmSize = 40;
  const wmWidth = fontBold.widthOfTextAtSize(wmText, wmSize);
  const wmHeight = wmSize;
  const angleRad = (-30 * Math.PI) / 180;
  const cx = pageWidth / 2;
  const cy = pageHeight / 2;
  const offX = (wmWidth * Math.cos(angleRad) - wmHeight * Math.sin(angleRad)) / 2;
  const offY = (wmWidth * Math.sin(angleRad) + wmHeight * Math.cos(angleRad)) / 2;

  page.drawText(wmText, {
    x: cx - offX,
    y: cy - offY + 5,
    size: wmSize,
    font: fontBold,
    color: rgb(0.95, 0.75, 0),  // golden-yellow
    rotate: degrees(-30),
    opacity: 0.28,
  });

  // ── Header: LERP logo (square 50×50) in top-left ──
  let logoAreaWidth = 0;
  const logoBytes = await loadLogoBytes();
  if (logoBytes) {
    try {
      const logoImage = await pdfDoc.embedPng(logoBytes);
      const logoSize = 50;
      page.drawImage(logoImage, {
        x: 10,
        y: pageHeight - 60,
        width: logoSize,
        height: logoSize,
      });
      logoAreaWidth = logoSize + 10;
    } catch {
      logoAreaWidth = 0;
    }
  }

  // ── Title area (right of logo) ──
  const tx = logoAreaWidth + 15;
  const titleMaxW = pageWidth - tx - 10;

  // Composition as main title (truncated if needed)
  const composicao = sanitizeForPdf(residuo.composicao?.trim() || "Chemical Waste");
  const maxTitleLen = 40;
  const titleText = composicao.length > maxTitleLen
    ? composicao.substring(0, maxTitleLen) + "..."
    : composicao;

  page.drawText(titleText, {
    x: tx,
    y: pageHeight - 20,
    size: 12,
    font: fontBold,
    color: rgb(0.12, 0.18, 0.26),
    maxWidth: titleMaxW,
  });

  // Subtitle: class + state
  const classe = residuo.classe ?? "-";
  const estado = residuo.estado ?? "-";
  page.drawText(`Class: ${classe}  |  State: ${estado}`, {
    x: tx,
    y: pageHeight - 32,
    size: 7,
    font,
    color: rgb(0.4, 0.4, 0.4),
    maxWidth: titleMaxW,
  });

  // ── Grey box with container number (matches reagent's internal code box) ──
  const boxY = 60;
  page.drawRectangle({
    x: 10,
    y: boxY,
    width: pageWidth - 20,
    height: 24,
    color: rgb(0.92, 0.92, 0.92),
  });

  page.drawText("CONTAINER #:", {
    x: 15,
    y: boxY + 14,
    size: 7,
    font,
    color: rgb(0.3, 0.3, 0.3),
  });

  const numeroRecipiente = String(residuo.numeroRecipiente ?? residuo.numeroOrdinal ?? "-");
  page.drawText(numeroRecipiente, {
    x: 15,
    y: boxY + 4,
    size: 11,
    font: fontBold,
    color: rgb(0, 0, 0),
  });

  // Volume info on the right side of the grey box
  const volumeRecipiente = asNumber(residuo.volumeRecipienteLitros) ?? asNumber(residuo.volumeRecipiente);
  if (volumeRecipiente !== null) {
    const volText = `Vol: ${volumeRecipiente} L`;
    const volWidth = font.widthOfTextAtSize(volText, 9);
    page.drawText(volText, {
      x: pageWidth - 15 - volWidth,
      y: boxY + 7,
      size: 9,
      font,
      color: rgb(0.2, 0.2, 0.2),
    });
  }

  // ── Fields below the grey box ──
  let y = boxY - 10;

  // Responsible
  page.drawText("RESPONSIBLE:", {
    x: 15,
    y,
    size: 7,
    font,
    color: rgb(0.3, 0.3, 0.3),
  });
  page.drawText(sanitizeForPdf(residuo.responsavel?.trim() || "-"), {
    x: 80,
    y,
    size: 9,
    font,
    color: rgb(0, 0, 0),
  });

  // Department on the right
  const dept = sanitizeForPdf(residuo.departamento?.trim() || "");
  if (dept) {
    const deptLabel = "DEPT:";
    page.drawText(deptLabel, {
      x: 200,
      y,
      size: 7,
      font,
      color: rgb(0.3, 0.3, 0.3),
    });
    page.drawText(dept, {
      x: 228,
      y,
      size: 9,
      font,
      color: rgb(0, 0, 0),
      maxWidth: pageWidth - 228 - 15,
    });
  }

  y -= 12;

  // Container type
  if (residuo.tipoRecipiente?.trim()) {
    page.drawText(sanitizeForPdf(`Container: ${residuo.tipoRecipiente.trim()}`), {
      x: 15,
      y,
      size: 7,
      font,
      color: rgb(0.25, 0.25, 0.25),
      maxWidth: pageWidth - 30,
    });
  }

  // ── Footer line ──
  page.drawLine({
    start: { x: 15, y: 20 },
    end: { x: pageWidth - 15, y: 20 },
    thickness: 0.7,
    color: rgb(0.88, 0.9, 0.92),
  });

  const dataStr = formatDatePtBR(residuo.data);
  const ph = asNumber(residuo.ph);
  const footerParts = [`Date: ${dataStr}`];
  if (ph !== null) footerParts.push(`pH: ${ph}`);

  page.drawText(sanitizeForPdf(footerParts.join("    ")), {
    x: 15,
    y: 12,
    size: 7,
    font,
    color: rgb(0.4, 0.4, 0.4),
    maxWidth: pageWidth - 30,
  });

  // LERP footer on the right
  const lerpFooter = "LERP";
  const lerpW = fontBold.widthOfTextAtSize(lerpFooter, 7);
  page.drawText(lerpFooter, {
    x: pageWidth - 15 - lerpW,
    y: 12,
    size: 7,
    font: fontBold,
    color: rgb(0.4, 0.4, 0.4),
  });

  return Buffer.from(await pdfDoc.save());
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

  // The template has merged cells in the header (A1:G1, A2:G2, A3:D3, E3:G3).
  // To ensure consistent filling, we write directly to the label cells.
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

  // Process 2 labels per page
  for (let i = 0; i < residuos.length; i += 2) {
    const children: any[] = [];

    // Label 1
    children.push(criarRotuloTemplate(residuos[i]));

    // Small space between labels
    children.push(new Paragraph({ spacing: { before: 100, after: 100 } }));

    // Label 2 (if exists)
    if (residuos[i + 1]) {
      children.push(criarRotuloTemplate(residuos[i + 1]));
    }

    // Page break after each pair
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
      // Line 1: FEQ/UNICAMP header
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

      // Line 3: Laboratory/Responsible
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

      // Line 4: Responsible for information
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

      // Line 5: Waste origin/Analysis description
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

      // Waste class
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

      // Checkboxes - Mandatory filling
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

      // Composition table
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

      // 4 lines for composition
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
