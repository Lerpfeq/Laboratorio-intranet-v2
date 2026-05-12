import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (user?.category === "IC") {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const body = await request.json();
    const reagenteId = typeof body.reagenteId === "string" ? body.reagenteId : undefined;
    const codigoInformado =
      typeof body.codigo === "string"
        ? body.codigo
        : typeof body.codigoInterno === "string"
          ? body.codigoInterno
          : "";
    const codigoInterno = codigoInformado.trim().toUpperCase();
    const quantidadeSaidaInformada = Number.parseFloat(String(body.quantidadeSaida ?? body.volumeSaida ?? "0"));
    const quantidadeSaida = Number.isFinite(quantidadeSaidaInformada) && quantidadeSaidaInformada > 0
      ? quantidadeSaidaInformada
      : null;

    const motivo = typeof body.motivo === "string" ? body.motivo.trim() : "";

    const entradaPorId = reagenteId
      ? await prisma.reagenteEntrada.findUnique({ where: { id: reagenteId }, include: { reagente: true } })
      : null;

    const entradaPorCodigo = !entradaPorId && codigoInterno
      ? await prisma.reagenteEntrada.findUnique({ where: { codigoInterno }, include: { reagente: true } })
      : null;

    const entrada = entradaPorId ?? entradaPorCodigo;

    if (!entrada?.reagente) {
      return NextResponse.json({ error: "Reagent not found for the provided code" }, { status: 404 });
    }

    const quantidadeDisponivel = entrada.quantidadeAtual ?? entrada.quantidade;

    if (quantidadeSaida !== null && quantidadeDisponivel > 0 && quantidadeSaida > quantidadeDisponivel) {
      return NextResponse.json({ error: "Output quantity is greater than available quantity" }, { status: 400 });
    }

    const novaQuantidade =
      quantidadeDisponivel > 0 && quantidadeSaida !== null
        ? Math.max(quantidadeDisponivel - quantidadeSaida, 0)
        : 0;

    await prisma.$transaction(async (tx) => {
      await tx.reagenteSaida.create({
        data: {
          reagenteId: entrada.reagenteId,
          usuarioId: session.user.id,
          dataSaida: new Date(),
          quantidade: 1,
          observacoes: [
            `Internal code: ${entrada.codigoInterno}`,
            quantidadeSaida !== null ? `Output quantity: ${quantidadeSaida} ${entrada.unidade}` : null,
            motivo ? `Reason: ${motivo}` : null,
          ].filter(Boolean).join(" | "),
        },
      });

      if (quantidadeSaida !== null && novaQuantidade > 0) {
        await tx.reagenteEntrada.update({
          where: { id: entrada.id },
          data: { quantidadeAtual: novaQuantidade },
        });
      } else {
        await tx.reagenteEntrada.delete({ where: { id: entrada.id } });

        const entradasRestantes = await tx.reagenteEntrada.count({ where: { reagenteId: entrada.reagenteId } });
        if (entradasRestantes === 0) {
          await tx.reagente.delete({ where: { id: entrada.reagenteId } });
        }
      }
    });

    return NextResponse.json({
      success: true,
      codigoInterno: entrada.codigoInterno,
      novaQuantidade,
      removido: !(quantidadeSaida !== null && novaQuantidade > 0),
    });
  } catch (error: any) {
    console.error("Error registering output:", error);
    return NextResponse.json({ error: error?.message || "Error registering output" }, { status: 500 });
  }
}
