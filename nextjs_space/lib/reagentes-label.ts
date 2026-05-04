import { PDFDocument, StandardFonts, rgb, degrees } from "pdf-lib";
import { readFile } from "fs/promises";
import path from "path";

type ReagenteEtiquetaPayload = {
  nome?: string | null;
  codigoInterno?: string | null;
  codigo?: string | null;
  categoria?: string | null;
  concentracao?: string | null;
  localizacao?: string | null;
  dataValidade?: Date | string | null;
  dataEntrada?: Date | string | null;
  fornecedor?: string | null;
  fabricante?: string | null;
  notaFiscal?: string | null;
  responsavel?: string | null;
  perigos?: string | null;
};

function formatDate(value?: Date | string | null, locale = "en-US"): string {
  if (!value) return "-";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString(locale);
}

function isExpired(value?: Date | string | null): boolean {
  if (!value) return false;

  const validade = value instanceof Date ? new Date(value) : new Date(value);
  if (Number.isNaN(validade.getTime())) return false;

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);
  validade.setHours(0, 0, 0, 0);

  return validade < hoje;
}

async function loadLogoBytes(): Promise<Uint8Array | null> {
  try {
    const logoPath = path.join(process.cwd(), "public", "logo.png");
    return await readFile(logoPath);
  } catch {
    return null;
  }
}

export async function gerarEtiquetaReagente(payload: ReagenteEtiquetaPayload): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  // Proporção próxima ao layout profissional (15cm x 8cm visual)
  const page = pdfDoc.addPage([425, 230]);

  const fontRegular = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = page.getWidth();
  const pageHeight = page.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;

  const expirado = isExpired(payload.dataValidade);

  // Fundo/base da etiqueta
  page.drawRectangle({
    x: margin - 2,
    y: margin - 2,
    width: contentWidth + 4,
    height: pageHeight - (margin - 2) * 2,
    borderWidth: 1.4,
    borderColor: rgb(0.17, 0.24, 0.32),
    color: rgb(1, 1, 1),
  });

  // Overlay de vencido (cinza + marca d'água)
  if (expirado) {
    page.drawRectangle({
      x: margin,
      y: margin,
      width: contentWidth,
      height: pageHeight - margin * 2,
      color: rgb(0.85, 0.85, 0.85),
      opacity: 0.42,
    });

    page.drawText("EXPIRADO", {
      x: pageWidth / 2 - 100,
      y: pageHeight / 2 - 18,
      size: 52,
      font: fontBold,
      color: rgb(0.82, 0.1, 0.1),
      rotate: degrees(-28),
      opacity: 0.55,
    });
  }

  let y = pageHeight - 30;

  // Header com logo + nome + subtítulo
  const logoBytes = await loadLogoBytes();
  if (logoBytes) {
    try {
      const logoImage = await pdfDoc.embedPng(logoBytes);
      const targetHeight = 34;
      const logoScale = targetHeight / logoImage.height;
      const logoWidth = logoImage.width * logoScale;
      page.drawImage(logoImage, {
        x: margin + 2,
        y: y - 14,
        width: logoWidth,
        height: targetHeight,
      });
    } catch {
      // se falhar, segue sem logo
    }
  }

  const nome = payload.nome?.trim() || "Reagente";
  page.drawText(nome, {
    x: margin + 90,
    y,
    size: 18,
    font: fontBold,
    color: rgb(0.12, 0.18, 0.26),
  });

  y -= 14;
  page.drawText("LERP — Polymer Reaction Engineering Laboratory", {
    x: margin + 90,
    y,
    size: 8,
    font: fontRegular,
    color: rgb(0.49, 0.55, 0.62),
  });

  y -= 10;
  page.drawLine({
    start: { x: margin + 2, y },
    end: { x: pageWidth - margin - 2, y },
    thickness: 1,
    color: rgb(0.9, 0.92, 0.94),
  });

  // Caixa cinza com INTERNAL CODE (e concentração opcional)
  y -= 12;
  const codeBoxHeight = payload.concentracao ? 38 : 30;
  page.drawRectangle({
    x: margin + 2,
    y: y - codeBoxHeight + 6,
    width: contentWidth - 4,
    height: codeBoxHeight,
    color: rgb(0.93, 0.95, 0.96),
  });

  page.drawText("INTERNAL CODE:", {
    x: margin + 10,
    y: y - 6,
    size: 8,
    font: fontBold,
    color: rgb(0.5, 0.55, 0.6),
  });

  page.drawText(payload.codigoInterno || payload.codigo || "-", {
    x: margin + 10,
    y: y - 19,
    size: 12,
    font: fontBold,
    color: rgb(0.14, 0.2, 0.28),
  });

  if (payload.concentracao) {
    page.drawText("CONCENTRATION:", {
      x: pageWidth / 2 + 6,
      y: y - 6,
      size: 8,
      font: fontBold,
      color: rgb(0.5, 0.55, 0.6),
    });

    page.drawText(payload.concentracao, {
      x: pageWidth / 2 + 6,
      y: y - 19,
      size: 12,
      font: fontBold,
      color: rgb(0.14, 0.2, 0.28),
    });
  }

  // RESPONSIBLE
  y -= codeBoxHeight + 10;
  page.drawText("RESPONSIBLE:", {
    x: margin + 4,
    y,
    size: 8,
    font: fontBold,
    color: rgb(0.5, 0.55, 0.6),
  });

  y -= 12;
  page.drawText(payload.responsavel?.trim() || "-", {
    x: margin + 4,
    y,
    size: 10,
    font: fontRegular,
    color: rgb(0.13, 0.18, 0.24),
  });

  // Bloco de risco opcional
  if (payload.perigos?.trim()) {
    y -= 16;
    page.drawRectangle({
      x: margin + 2,
      y: y - 11,
      width: contentWidth - 4,
      height: 16,
      color: rgb(1, 0.93, 0.93),
      borderColor: rgb(0.9, 0.35, 0.35),
      borderWidth: 0.8,
    });

    page.drawText(`⚠ ${payload.perigos}`, {
      x: margin + 8,
      y: y - 6,
      size: 9,
      font: fontBold,
      color: rgb(0.72, 0.2, 0.2),
    });
  }

  // Rodapé
  const entrada = formatDate(payload.dataEntrada, "en-US");
  const supplier = payload.fornecedor?.trim() || payload.fabricante?.trim() || "-";

  page.drawLine({
    start: { x: margin + 2, y: 44 },
    end: { x: pageWidth - margin - 2, y: 44 },
    thickness: 1,
    color: rgb(0.92, 0.94, 0.96),
  });

  page.drawText(`Entry: ${entrada}    Supplier: ${supplier}`, {
    x: margin + 4,
    y: 30,
    size: 8,
    font: fontRegular,
    color: rgb(0.58, 0.63, 0.68),
  });

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}
