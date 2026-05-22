import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { gerarEtiquetaReagente } from "@/lib/reagentes-label";

export const dynamic = "force-dynamic";

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (user?.category === "IC") {
      return NextResponse.json({ error: "No permission" }, { status: 403 });
    }

    // Reissue must use a specific bottle (ReagenteEntrada), not the last one in the family
    const entrada = await prisma.reagenteEntrada.findUnique({
      where: { id: params.id },
      include: { reagente: true },
    });

    if (!entrada) {
      return NextResponse.json(
        { error: "Bottle not found" },
        { status: 404 }
      );
    }

    // Keep EXACTLY the same payload usado no POST de entrada (/api/reagentes)
    const etiquetaPayload = {
      nome: entrada.reagente.nome,
      codigoInterno: entrada.codigoInterno,
      categoria: entrada.categoria,
      concentracao: entrada.concentracao,
      localizacao: entrada.localizacao,
      dataValidade: entrada.dataValidade,
      dataEntrada: entrada.dataEntrada,
      fornecedor: entrada.fornecedor,
      marca: entrada.marca || entrada.reagente.marca,
      notaFiscal: entrada.notaFiscal,
      responsavel: entrada.responsavel,
      perigos: entrada.perigos,
    };

    const pdfBuffer = await gerarEtiquetaReagente(etiquetaPayload);

    return NextResponse.json({
      success: true,
      etiquetaPdfBase64: pdfBuffer.toString("base64"),
      etiquetaFileName: `etiqueta-${entrada.codigoInterno}.pdf`,
    });
  } catch (error) {
    console.error("Erro ao reemitir etiqueta de reagente:", error);
    return NextResponse.json(
      { error: "Erro ao gerar etiqueta" },
      { status: 500 }
    );
  }
}
