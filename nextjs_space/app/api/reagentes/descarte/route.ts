import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autorizado" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (user?.category === "IC") {
      return NextResponse.json({ error: "Permissão negada" }, { status: 403 });
    }

    const data = await request.json();
    const reagenteId = typeof data.reagenteId === "string" ? data.reagenteId : "";
    const codigo = typeof data.codigo === "string" ? data.codigo : "";

    if (!reagenteId) {
      return NextResponse.json({ error: "ID do reagente não informado" }, { status: 400 });
    }

    const reagente = await prisma.reagenteEntrada.findUnique({
      where: { id: reagenteId },
      select: { id: true, reagenteId: true, codigoInterno: true },
    });

    if (!reagente) {
      return NextResponse.json({ error: "Reagente não encontrado" }, { status: 404 });
    }

    await prisma.$transaction(async (tx) => {
      await tx.reagenteEntrada.delete({ where: { id: reagenteId } });

      const entradasRestantes = await tx.reagenteEntrada.count({
        where: { reagenteId: reagente.reagenteId },
      });

      await tx.reagente.update({
        where: { id: reagente.reagenteId },
        data: {
          status: entradasRestantes > 0 ? "ok" : "esgotado",
          ultimaAtualizacao: new Date(),
        },
      });
    });

    console.log(`Reagente ${codigo || reagente.codigoInterno} deletado por ${session.user.name || session.user.id}`);

    return NextResponse.json({
      success: true,
      message: "Reagente deletado com sucesso",
    });
  } catch (error) {
    console.error("Erro ao deletar reagente:", error);
    return NextResponse.json({ error: "Erro ao deletar reagente" }, { status: 500 });
  }
}
