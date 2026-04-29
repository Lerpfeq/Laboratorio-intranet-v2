import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { CampanhaPayload } from "@/lib/residuos";
import {
  ensureTemplateExists,
  generateCampanhaExcel,
  generateEtiquetasCampanhaPdf,
} from "@/lib/residuos-docs";

export const dynamic = "force-dynamic";

function toFiniteNumber(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeCampanhaPayload(body: any): CampanhaPayload {
  return {
    departamento: body?.departamento ? String(body.departamento).trim() : undefined,
    responsavelInformacoes: body?.responsavelInformacoes
      ? String(body.responsavelInformacoes).trim()
      : undefined,
    data: body?.data,
    itens: Array.isArray(body?.itens)
      ? body.itens
          .map((item: any) => ({
            id: String(item?.id || ""),
            volumeAtualLitros: toFiniteNumber(item?.volumeAtualLitros) ?? -1,
          }))
          .filter((item: any) => item.id)
      : [],
  };
}

async function getAuthedUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Não autenticado", status: 401 as const };

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return { error: "Usuário não encontrado", status: 404 as const };
  if (user.category === "IC") return { error: "Permissão negada", status: 403 as const };

  return { session, user };
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthedUser();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    ensureTemplateExists();

    const payload = normalizeCampanhaPayload(await request.json());
    if (!payload.itens.length) {
      return NextResponse.json({ error: "Nenhum frasco selecionado para campanha" }, { status: 400 });
    }

    const invalidVolume = payload.itens.find((item) => item.volumeAtualLitros < 0);
    if (invalidVolume) {
      return NextResponse.json({ error: "Volume atual inválido para um ou mais itens" }, { status: 400 });
    }

    const ids = payload.itens.map((item) => item.id);

    const registros = await prisma.registroResiduo.findMany({
      where: {
        id: { in: ids },
        ...(auth.user.category === "Admin" ? {} : { usuarioId: auth.user.id }),
      },
      orderBy: { createdAt: "asc" },
    });

    if (registros.length !== ids.length) {
      return NextResponse.json(
        {
          error:
            "Um ou mais frascos não foram encontrados ou não pertencem ao usuário atual",
        },
        { status: 404 }
      );
    }

    const byId = new Map(registros.map((r) => [r.id, r]));

    const itemsWithOrdinal = payload.itens.map((item, index) => {
      const residuo = byId.get(item.id);
      if (!residuo) {
        throw new Error(`Resíduo ${item.id} não encontrado`);
      }

      return {
        ordinal: index + 1,
        residuo: {
          ...residuo,
          volumeAtualLitros: item.volumeAtualLitros,
        },
      };
    });

    const excelBuffer = generateCampanhaExcel({
      residuos: itemsWithOrdinal,
      departamento: payload.departamento || registros[0]?.departamento,
      responsavelInformacoes: payload.responsavelInformacoes || auth.user.name || auth.user.email || "Não informado",
      data: payload.data ? new Date(payload.data) : new Date(),
    });

    const etiquetasPdfBuffer = await generateEtiquetasCampanhaPdf(itemsWithOrdinal as any);

    await prisma.$transaction(async (tx) => {
      for (const item of payload.itens) {
        await tx.registroResiduo.delete({ where: { id: item.id } });
      }
    });

    return NextResponse.json({
      excelBase64: excelBuffer.toString("base64"),
      excelFileName: `campanha-residuos-${Date.now()}.xls`,
      etiquetasPdfBase64: etiquetasPdfBuffer.toString("base64"),
      etiquetasPdfFileName: `etiquetas-campanha-${Date.now()}.pdf`,
      totalItens: payload.itens.length,
      excluidos: payload.itens.length,
    });
  } catch (error: any) {
    console.error("POST /api/residuos/campanha error:", error);
    return NextResponse.json(
      { error: error?.message || "Erro ao processar campanha de recolhimento" },
      { status: 500 }
    );
  }
}
