import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const codigoRaw = searchParams.get("codigo");
    const codigo = codigoRaw?.trim().toUpperCase();

    if (!codigo) {
      return NextResponse.json({ error: "Código não fornecido" }, { status: 400 });
    }

    const reagenteEntrada = await prisma.reagenteEntrada.findUnique({
      where: { codigoInterno: codigo },
      include: {
        reagente: {
          select: {
            id: true,
            nome: true,
            marca: true,
          },
        },
      },
    });

    if (!reagenteEntrada?.reagente) {
      return NextResponse.json({ success: false, error: "Reagente não encontrado" }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      reagente: {
        id: reagenteEntrada.id,
        reagenteId: reagenteEntrada.reagenteId,
        codigo: reagenteEntrada.codigoInterno,
        nome: reagenteEntrada.reagente.nome,
        fabricante: reagenteEntrada.marca || reagenteEntrada.reagente.marca || "-",
        localizacao: reagenteEntrada.localizacao || "-",
        volume: reagenteEntrada.volume,
        dataEntrada: reagenteEntrada.dataEntrada,
        dataValidade: reagenteEntrada.dataValidade,
      },
    });
  } catch (error) {
    console.error("Erro ao buscar reagente:", error);
    return NextResponse.json({ error: "Erro ao buscar reagente" }, { status: 500 });
  }
}
