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
  VerticalAlign,
  WidthType,
} from "docx";

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

export async function gerarRotulosCampanha(residuos: any[]): Promise<Buffer> {
  const sections: any[] = [];

  // Processar 2 rótulos por página
  for (let i = 0; i < residuos.length; i += 2) {
    const children: any[] = [];

    // Rótulo 1
    children.push(...criarRotulo(residuos[i]));

    // Espaço entre rótulos
    children.push(new Paragraph({ spacing: { before: 200, after: 200 } }));

    // Linha divisória pontilhada
    children.push(
      new Paragraph({
        border: {
          top: { style: BorderStyle.DASH_SMALL_GAP, size: 6, color: "999999" },
        },
        spacing: { before: 100, after: 100 },
      })
    );

    children.push(new Paragraph({ spacing: { before: 200, after: 200 } }));

    // Rótulo 2 (se existir)
    if (residuos[i + 1]) {
      children.push(...criarRotulo(residuos[i + 1]));
    }

    // Quebra de página após cada par de rótulos (exceto no último)
    if (i + 2 < residuos.length) {
      children.push(new Paragraph({ children: [new PageBreak()] }));
    }

    sections.push({
      properties: {
        page: {
          size: { width: 11906, height: 16838 }, // A4
          margin: { top: 720, right: 720, bottom: 720, left: 720 }, // 1.27cm
        },
      },
      children,
    });
  }

  const doc = new Document({ sections });
  return await Packer.toBuffer(doc);
}

function criarRotulo(residuo: any): any[] {
  const elements: any[] = [];

  // Cabeçalho com número no canto direito
  elements.push(
    new Table({
      width: { size: 100, type: WidthType.PERCENTAGE },
      borders: {
        top: { style: BorderStyle.SINGLE, size: 15, color: "000000" },
        bottom: { style: BorderStyle.SINGLE, size: 15, color: "000000" },
        left: { style: BorderStyle.SINGLE, size: 15, color: "000000" },
        right: { style: BorderStyle.SINGLE, size: 15, color: "000000" },
        insideHorizontal: { style: BorderStyle.SINGLE, size: 6, color: "CCCCCC" },
        insideVertical: { style: BorderStyle.SINGLE, size: 6, color: "CCCCCC" },
      },
      rows: [
        // Linha 1: Título + Número
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: "RESÍDUO QUÍMICO",
                      bold: true,
                      size: 28,
                    }),
                  ],
                }),
              ],
              width: { size: 70, type: WidthType.PERCENTAGE },
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: String(residuo.numeroOrdinal || ""),
                      bold: true,
                      size: 48,
                      color: "FF0000",
                    }),
                  ],
                  alignment: AlignmentType.RIGHT,
                }),
              ],
              width: { size: 30, type: WidthType.PERCENTAGE },
              verticalAlign: VerticalAlign.CENTER,
            }),
          ],
        }),

        // Linha 2: Departamento
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: "Departamento: ", bold: true }),
                    new TextRun({ text: residuo.departamento || "" }),
                  ],
                }),
              ],
              columnSpan: 2,
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
                    new TextRun({ text: "Laboratório/Responsável: ", bold: true }),
                    new TextRun({ text: "LERP / Prof. Dr. Roniérik Pioli Vieira" }),
                  ],
                }),
              ],
              columnSpan: 2,
            }),
          ],
        }),

        // Linha 4: Responsável pelo preenchimento
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: "Responsável: ", bold: true }),
                    new TextRun({ text: residuo.responsavel || "" }),
                  ],
                }),
              ],
              width: { size: 60, type: WidthType.PERCENTAGE },
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: "Data: ", bold: true }),
                    new TextRun({
                      text: residuo.data ? new Date(residuo.data).toLocaleDateString("pt-BR") : "",
                    }),
                  ],
                }),
              ],
              width: { size: 40, type: WidthType.PERCENTAGE },
            }),
          ],
        }),

        // Linha 5: Composição
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: "Composição do Resíduo: ", bold: true }),
                    new TextRun({ text: residuo.composicao || "" }),
                  ],
                }),
              ],
              columnSpan: 2,
            }),
          ],
        }),

        // Linha 6: Classe e Estado
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: "Classe: ", bold: true }),
                    new TextRun({ text: residuo.classe || "" }),
                  ],
                }),
              ],
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: "Estado: ", bold: true }),
                    new TextRun({ text: residuo.estado || "" }),
                  ],
                }),
              ],
            }),
          ],
        }),

        // Linha 7: pH e Recipiente
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: "pH: ", bold: true }),
                    new TextRun({ text: residuo.ph ? String(residuo.ph) : "" }),
                  ],
                }),
              ],
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: "Recipiente: ", bold: true }),
                    new TextRun({ text: residuo.tipoRecipiente || "" }),
                  ],
                }),
              ],
            }),
          ],
        }),

        // Linha 8: Volumes
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: "Volume do resíduo (L): ", bold: true }),
                    new TextRun({ text: String(residuo.volumeAtual || residuo.volume || "") }),
                  ],
                }),
              ],
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: "Volume do recipiente (L): ", bold: true }),
                    new TextRun({ text: String(residuo.volumeRecipiente || "") }),
                  ],
                }),
              ],
            }),
          ],
        }),

        // Linha 9: Checklist - Título
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: "CHECKLIST DE SEGURANÇA", bold: true, size: 22 }),
                  ],
                  alignment: AlignmentType.CENTER,
                }),
              ],
              columnSpan: 2,
              shading: { fill: "EEEEEE" },
            }),
          ],
        }),

        // Linha 10-12: Checkboxes
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: "Halogenados: " }),
                    new TextRun({ text: residuo.halogenados ? "SIM ☑" : "NÃO ☐", bold: true }),
                    new TextRun({ text: ` (${residuo.halogenados || 0}%)` }),
                  ],
                }),
              ],
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: "Enxofre/Sulfurados: " }),
                    new TextRun({ text: residuo.enxofre ? "SIM ☑" : "NÃO ☐", bold: true }),
                  ],
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
                  children: [
                    new TextRun({ text: "Acetonitrila: " }),
                    new TextRun({ text: residuo.acetonitrila ? "SIM ☑" : "NÃO ☐", bold: true }),
                    new TextRun({ text: ` (${residuo.acetonitrila || 0}%)` }),
                  ],
                }),
              ],
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: "Cianetos: " }),
                    new TextRun({ text: residuo.cianeto ? "SIM ☑" : "NÃO ☐", bold: true }),
                  ],
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
                  children: [
                    new TextRun({ text: "Metais Pesados: " }),
                    new TextRun({ text: residuo.metaisPesados ? "SIM ☑" : "NÃO ☐", bold: true }),
                    new TextRun({ text: ` (${residuo.metaisPesados || 0}%)` }),
                  ],
                }),
              ],
            }),
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({ text: "Aminas: " }),
                    new TextRun({ text: residuo.aminas ? "SIM ☑" : "NÃO ☐", bold: true }),
                  ],
                }),
              ],
            }),
          ],
        }),

        // Linha 13: Aviso
        new TableRow({
          children: [
            new TableCell({
              children: [
                new Paragraph({
                  children: [
                    new TextRun({
                      text: "ATENÇÃO: Utilize apenas 75% do volume do frasco",
                      bold: true,
                      color: "FF0000",
                      size: 20,
                    }),
                  ],
                  alignment: AlignmentType.CENTER,
                }),
              ],
              columnSpan: 2,
              shading: { fill: "FFEEEE" },
            }),
          ],
        }),
      ],
    })
  );

  return elements;
}
