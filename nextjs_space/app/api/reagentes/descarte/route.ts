import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function DELETE(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (user?.category === "IC") {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const data = await request.json();
    const reagenteId = typeof data.reagenteId === "string" ? data.reagenteId : "";
    const codigo = typeof data.codigo === "string" ? data.codigo : "";

    if (!reagenteId) {
      return NextResponse.json({ error: "Missing reagent bottle id" }, { status: 400 });
    }

    const reagente = await prisma.reagenteEntrada.findUnique({
      where: { id: reagenteId },
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

    if (!reagente?.reagente) {
      return NextResponse.json({ error: "Reagent not found" }, { status: 404 });
    }

    const result = await prisma.$transaction(async (tx) => {
      await tx.reagenteEntrada.delete({ where: { id: reagenteId } });

      const outrosFrascos = await tx.reagenteEntrada.findFirst({
        where: { reagenteId: reagente.reagenteId },
      });

      if (!outrosFrascos) {
        await tx.reagente.delete({ where: { id: reagente.reagenteId } });
      } else {
        await tx.reagente.update({
          where: { id: reagente.reagenteId },
          data: { status: "ok", ultimaAtualizacao: new Date() },
        });
      }

      return { wasLastBottle: !outrosFrascos };
    });

    console.log(`Bottle ${codigo || reagente.codigoInterno} deleted by ${session.user.name || session.user.id}`);
    if (result.wasLastBottle) {
      console.log(`Last bottle of ${reagente.reagente.nome} removed from database`);
    }

    return NextResponse.json({
      success: true,
      message: "Reagent bottle deleted successfully",
      wasLastBottle: result.wasLastBottle,
    });
  } catch (error) {
    console.error("Error deleting reagent:", error);
    return NextResponse.json({ error: "Error deleting reagent" }, { status: 500 });
  }
}
