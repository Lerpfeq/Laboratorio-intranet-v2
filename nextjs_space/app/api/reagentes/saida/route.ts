import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function parseVolume(value?: string | null): number {
  if (!value) return 0;
  const normalized = value.replace(",", ".").trim();
  const parsed = Number.parseFloat(normalized);
  return Number.isFinite(parsed) ? parsed : 0;
}

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
    const reagenteId = typeof body.reagenteId === "string" ? body.reagenteId : undefined;
    const codigoInformado =
      typeof body.codigo === "string"
        ? body.codigo
        : typeof body.codigoInterno === "string"
          ? body.codigoInterno
          : "";
    const codigoInterno = codigoInformado.trim().toUpperCase();

    const volumeSaidaInformado = Number.parseFloat(String(body.volumeSaida ?? "0"));
    const volumeSaida = Number.isFinite(volumeSaidaInformado) && volumeSaidaInformado > 0 ? volumeSaidaInformado : null;

    const motivo = typeof body.motivo === "string" ? body.motivo.trim() : "";

    const entradaPorId = reagenteId
      ? await prisma.reagenteEntrada.findUnique({
          where: { id: reagenteId },
          include: { reagente: true },
        })
      : null;

    const entradaPorCodigo = !entradaPorId && codigoInterno
      ? await prisma.reagenteEntrada.findUnique({
          where: { codigoInterno },
          include: { reagente: true },
        })
      : null;

    const entrada = entradaPorId ?? entradaPorCodigo;

    if (!entrada?.reagente) {
      return NextResponse.json(
        { error: "Reagente não encontrado para o código informado" },
        { status: 404 }
      );
    }

    const volumeDisponivel = parseVolume(entrada.volume);

    if (volumeSaida !== null && volumeDisponivel > 0 && volumeSaida > volumeDisponivel) {
      return NextResponse.json(
        { error: "Volume de saída maior que o volume disponível" },
        { status: 400 }
      );
    }

    const observacoesSaida = [
      `Código interno: ${entrada.codigoInterno}`,
      volumeSaida !== null ? `Volume de saída: ${volumeSaida}` : null,
      volumeDisponivel > 0 && volumeSaida !== null ? `Volume restante: ${Math.max(volumeDisponivel - volumeSaida, 0)}` : null,
      motivo ? `Motivo: ${motivo}` : null,
      body.responsavel ? `Responsável informado: ${body.responsavel}` : null,
    ]
      .filter(Boolean)
      .join(" | ");

    const novoVolume =
      volumeDisponivel > 0 && volumeSaida !== null
        ? Math.max(volumeDisponivel - volumeSaida, 0)
        : 0;

    await prisma.$transaction(async (tx) => {
      await tx.reagenteSaida.create({
        data: {
          reagenteId: entrada.reagenteId,
          usuarioId: session.user.id,
          dataSaida: new Date(),
          quantidade: 1,
          observacoes: observacoesSaida || null,
        },
      });

      if (volumeDisponivel > 0 && volumeSaida !== null && novoVolume > 0) {
        await tx.reagenteEntrada.update({
          where: { id: entrada.id },
          data: {
            volume: String(novoVolume),
          },
        });
      } else {
        await tx.reagenteEntrada.delete({
          where: { id: entrada.id },
        });
      }

      const entradasRestantes = await tx.reagenteEntrada.count({
        where: { reagenteId: entrada.reagenteId },
      });

      await tx.reagente.update({
        where: { id: entrada.reagenteId },
        data: {
          status: entradasRestantes > 0 ? "ok" : "esgotado",
          ultimaAtualizacao: new Date(),
        },
      });
    });

    return NextResponse.json(
      {
        success: true,
        codigoInterno: entrada.codigoInterno,
        novoVolume,
        removido: !(volumeDisponivel > 0 && volumeSaida !== null && novoVolume > 0),
      },
      { status: 200 }
    );
  } catch (error: any) {
    console.error("Erro ao registrar saída:", error);
    return NextResponse.json(
      { error: error?.message || "Erro ao registrar saída" },
      { status: 500 }
    );
  }
}
