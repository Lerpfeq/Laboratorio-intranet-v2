import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (user?.category === "IC") {
      return NextResponse.json({ error: "Permissão negada" }, { status: 403 });
    }

    const body = await request.json();
    const { codigoInterno } = body;

    if (!codigoInterno || typeof codigoInterno !== "string") {
      return NextResponse.json(
        { error: "Código interno é obrigatório" },
        { status: 400 }
      );
    }

    const entrada = await prisma.reagenteEntrada.findUnique({
      where: { codigoInterno },
      include: {
        reagente: {
          select: {
            id: true,
            nome: true,
          },
        },
      },
    });

    if (!entrada?.reagente) {
      return NextResponse.json(
        { error: "Reagente não encontrado para o código informado" },
        { status: 404 }
      );
    }

    const reagenteRemovido = await prisma.reagente.delete({
      where: { id: entrada.reagenteId },
      select: {
        id: true,
        nome: true,
      },
    });

    return NextResponse.json(
      {
        message: "Reagente removido definitivamente com sucesso",
        reagente: reagenteRemovido,
      },
      { status: 200 }
    );
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Erro ao registrar saída" },
      { status: 500 }
    );
  }
}
