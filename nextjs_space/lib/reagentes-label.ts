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
  if (!value) return "";
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return date.toLocaleDateString(locale, {
    month: "numeric",
    day: "numeric",
    year: "numeric",
  });
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

  // Dimensões: 12cm x 5cm ~= 340 x 142 pt
  const page = pdfDoc.addPage([340, 142]);

  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const pageWidth = page.getWidth();
  const pageHeight = page.getHeight();
  const expirado = isExpired(payload.dataValidade);

  // Moldura externa
  page.drawRectangle({
    x: 1,
    y: 1,
    width: pageWidth - 2,
    height: pageHeight - 2,
    borderWidth: 1.5,
    borderColor: rgb(0.17, 0.24, 0.32),
    color: rgb(1, 1, 1),
  });

  // Header: logo em quadrado no canto superior esquerdo
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

  let x = logoAreaWidth + 15;
  let y = pageHeight - 20;
  const nomeMaxWidth = pageWidth - x - 10;

  page.drawText(payload.nome?.trim() || "Reagent", {
    x,
    y,
    size: 16,
    font: fontBold,
    color: rgb(0.12, 0.18, 0.26),
    maxWidth: nomeMaxWidth,
  });

  y -= 12;
  page.drawText("LERP — Polymer Reaction Engineering Laboratory", {
    x,
    y,
    size: 7,
    font,
    color: rgb(0.4, 0.4, 0.4),
    maxWidth: nomeMaxWidth,
  });

  y -= 30; // Increased spacing so gray box doesn't overlap logo

  // Caixa cinza com código interno (lowered to avoid logo overlap)
  const boxY = Math.min(y - 5, 60);
  page.drawRectangle({
    x: 10,
    y: boxY,
    width: pageWidth - 20,
    height: 24,
    color: rgb(0.92, 0.92, 0.92),
  });

  page.drawText("INTERNAL CODE:", {
    x: 15,
    y: boxY + 14,
    size: 7,
    font,
    color: rgb(0.3, 0.3, 0.3),
  });

  const codigo = payload.codigoInterno || payload.codigo || "";
  page.drawText(codigo, {
    x: 15,
    y: boxY + 4,
    size: 11,
    font: fontBold,
    color: rgb(0, 0, 0),
  });

  if (payload.concentracao?.trim()) {
    const codigoWidth = fontBold.widthOfTextAtSize(codigo, 11);
    page.drawText(`  ${payload.concentracao.trim()}`, {
      x: 15 + codigoWidth + 10,
      y: boxY + 4,
      size: 10,
      font,
      color: rgb(0.2, 0.2, 0.2),
    });
  }

  y = boxY - 10;

  // RESPONSIBLE
  page.drawText("RESPONSIBLE:", {
    x: 15,
    y,
    size: 7,
    font,
    color: rgb(0.3, 0.3, 0.3),
  });

  y -= 10;
  page.drawText(payload.responsavel?.trim() || "", {
    x: 15,
    y,
    size: 9,
    font,
    color: rgb(0, 0, 0),
  });

  // Rodapé
  const entrada = formatDate(payload.dataEntrada, "en-US");
  const fornecedor = payload.fornecedor?.trim() || payload.fabricante?.trim() || "";

  page.drawLine({
    start: { x: 15, y: 20 },
    end: { x: pageWidth - 15, y: 20 },
    thickness: 0.7,
    color: rgb(0.88, 0.9, 0.92),
  });

  page.drawText(`Entry: ${entrada}    Supplier: ${fornecedor}`, {
    x: 15,
    y: 12,
    size: 7,
    font,
    color: rgb(0.4, 0.4, 0.4),
    maxWidth: pageWidth - 30,
  });

  // Marca d'água EXPIRED (centralizada e mais transparente)
  if (expirado) {
    page.drawRectangle({
      x: 0,
      y: 0,
      width: pageWidth,
      height: pageHeight,
      color: rgb(0.85, 0.85, 0.85),
      opacity: 0.2,
    });

    const expiredText = "EXPIRED";
    const expiredFontSize = 40;
    const textWidth = fontBold.widthOfTextAtSize(expiredText, expiredFontSize);
    const textHeight = expiredFontSize;

    // Centralização considerando rotação de -30 graus
    const angleRad = (-30 * Math.PI) / 180;
    const centerX = pageWidth / 2;
    const centerY = pageHeight / 2;
    const offsetX = (textWidth * Math.cos(angleRad) - textHeight * Math.sin(angleRad)) / 2;
    const offsetY = (textWidth * Math.sin(angleRad) + textHeight * Math.cos(angleRad)) / 2;

    page.drawText(expiredText, {
      x: centerX - offsetX,
      y: centerY - offsetY + 5,
      size: expiredFontSize,
      font: fontBold,
      color: rgb(0.9, 0, 0),
      rotate: degrees(-30),
      opacity: 0.4,
    });
  }

  return Buffer.from(await pdfDoc.save());
}
