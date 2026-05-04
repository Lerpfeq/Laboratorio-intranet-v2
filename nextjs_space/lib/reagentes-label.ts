import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

type ReagenteEtiquetaPayload = {
  nome: string;
  codigoInterno: string;
  categoria?: string | null;
  concentracao?: string | null;
  localizacao?: string | null;
  dataValidade?: Date | string | null;
  dataEntrada?: Date | string | null;
  fornecedor?: string | null;
  notaFiscal?: string | null;
  responsavel?: string | null;
  perigos?: string | null;
};

function formatDate(value?: Date | string | null): string {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("pt-BR");
}

export async function gerarEtiquetaReagente(payload: ReagenteEtiquetaPayload): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([420, 270]);

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  page.drawRectangle({
    x: 14,
    y: 14,
    width: 392,
    height: 242,
    borderWidth: 1.5,
    borderColor: rgb(0.15, 0.2, 0.25),
    color: rgb(1, 1, 1),
  });

  page.drawText("LERP - ETIQUETA DE REAGENTE", {
    x: 26,
    y: 232,
    size: 14,
    font: fontBold,
    color: rgb(0.12, 0.18, 0.25),
  });

  page.drawLine({
    start: { x: 24, y: 224 },
    end: { x: 396, y: 224 },
    thickness: 1,
    color: rgb(0.78, 0.82, 0.86),
  });

  page.drawText(payload.nome || "-", {
    x: 26,
    y: 203,
    size: 13,
    font: fontBold,
    color: rgb(0.08, 0.14, 0.2),
  });

  page.drawText(`Codigo interno: ${payload.codigoInterno}`, {
    x: 26,
    y: 182,
    size: 12,
    font: fontBold,
    color: rgb(0.08, 0.14, 0.2),
  });

  const lines = [
    `Categoria: ${payload.categoria || "-"}`,
    `Concentracao: ${payload.concentracao || "-"}`,
    `Localizacao: ${payload.localizacao || "-"}`,
    `Validade: ${formatDate(payload.dataValidade)}`,
    `Entrada: ${formatDate(payload.dataEntrada)}`,
    `Fornecedor: ${payload.fornecedor || "-"}`,
    `Nota fiscal: ${payload.notaFiscal || "-"}`,
    `Responsavel: ${payload.responsavel || "-"}`,
    `Perigos: ${payload.perigos || "-"}`,
  ];

  let y = 160;
  for (const line of lines) {
    page.drawText(line, {
      x: 26,
      y,
      size: 10,
      font: fontRegular,
      color: rgb(0.2, 0.24, 0.3),
    });
    y -= 16;
  }

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
