import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  CLASSE_RESIDUO_VALUES,
  ESTADO_RESIDUO_VALUES,
  ResiduoPayload,
} from "@/lib/residuos";

export const dynamic = "force-dynamic";

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeResiduoPayload(body: any): Partial<ResiduoPayload> {
  return {
    composicao: body?.composicao !== undefined ? String(body.composicao || "").trim() : undefined,
    classe: body?.classe,
    estado: body?.estado,
    tipoRecipiente: body?.tipoRecipiente !== undefined ? String(body.tipoRecipiente || "").trim() : undefined,
    volumeRecipienteLitros:
      body?.volumeRecipienteLitros !== undefined ? Number(body.volumeRecipienteLitros) : undefined,
    responsavel: body?.responsavel !== undefined ? String(body.responsavel || "").trim() : undefined,
    departamento: body?.departamento !== undefined ? String(body.departamento || "").trim() : undefined,
    data: body?.data,
    ph: body?.ph !== undefined ? toNumberOrNull(body.ph) : undefined,
    observacoes: body?.observacoes !== undefined ? String(body.observacoes || "").trim() : undefined,
    halogenadosPercentual:
      body?.halogenadosPercentual !== undefined ? toNumberOrNull(body.halogenadosPercentual) : undefined,
    acetonitrilaPercentual:
      body?.acetonitrilaPercentual !== undefined ? toNumberOrNull(body.acetonitrilaPercentual) : undefined,
    metaisPesadosPercentual:
      body?.metaisPesadosPercentual !== undefined ? toNumberOrNull(body.metaisPesadosPercentual) : undefined,
    presencaEnxofre: body?.presencaEnxofre,
    geradorCianetos: body?.geradorCianetos,
    aminas: body?.aminas,
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

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await getAuthedUser();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const existing = await prisma.registroResiduo.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ error: "Resíduo não encontrado" }, { status: 404 });
    }

    if (auth.user.category !== "Admin" && existing.usuarioId !== auth.user.id) {
      return NextResponse.json({ error: "Permissão negada" }, { status: 403 });
    }

    const payload = normalizeResiduoPayload(await request.json());

    if (payload.classe && !CLASSE_RESIDUO_VALUES.includes(payload.classe)) {
      return NextResponse.json({ error: "Classe inválida" }, { status: 400 });
    }

    if (payload.estado && !ESTADO_RESIDUO_VALUES.includes(payload.estado)) {
      return NextResponse.json({ error: "Estado inválido" }, { status: 400 });
    }

    const updated = await prisma.registroResiduo.update({
      where: { id: params.id },
      data: {
        ...(payload.composicao !== undefined ? { composicao: payload.composicao } : {}),
        ...(payload.classe !== undefined ? { classe: payload.classe } : {}),
        ...(payload.estado !== undefined ? { estado: payload.estado } : {}),
        ...(payload.tipoRecipiente !== undefined ? { tipoRecipiente: payload.tipoRecipiente } : {}),
        ...(payload.volumeRecipienteLitros !== undefined
          ? { volumeRecipienteLitros: payload.volumeRecipienteLitros }
          : {}),
        ...(payload.responsavel !== undefined ? { responsavel: payload.responsavel } : {}),
        ...(payload.departamento !== undefined ? { departamento: payload.departamento } : {}),
        ...(payload.data !== undefined ? { data: payload.data ? new Date(payload.data) : existing.data } : {}),
        ...(payload.ph !== undefined ? { ph: payload.ph } : {}),
        ...(payload.observacoes !== undefined ? { observacoes: payload.observacoes || null } : {}),
        ...(payload.halogenadosPercentual !== undefined
          ? { halogenadosPercentual: payload.halogenadosPercentual }
          : {}),
        ...(payload.acetonitrilaPercentual !== undefined
          ? { acetonitrilaPercentual: payload.acetonitrilaPercentual }
          : {}),
        ...(payload.metaisPesadosPercentual !== undefined
          ? { metaisPesadosPercentual: payload.metaisPesadosPercentual }
          : {}),
        ...(payload.presencaEnxofre !== undefined ? { presencaEnxofre: Boolean(payload.presencaEnxofre) } : {}),
        ...(payload.geradorCianetos !== undefined
          ? { geradorCianetos: Boolean(payload.geradorCianetos) }
          : {}),
        ...(payload.aminas !== undefined ? { aminas: Boolean(payload.aminas) } : {}),
      },
    });

    return NextResponse.json(updated);
  } catch (error: any) {
    console.error("PUT /api/residuos/[id] error:", error);
    return NextResponse.json({ error: error?.message || "Erro ao atualizar resíduo" }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const auth = await getAuthedUser();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const existing = await prisma.registroResiduo.findUnique({ where: { id: params.id } });
    if (!existing) {
      return NextResponse.json({ error: "Resíduo não encontrado" }, { status: 404 });
    }

    if (auth.user.category !== "Admin" && existing.usuarioId !== auth.user.id) {
      return NextResponse.json({ error: "Permissão negada" }, { status: 403 });
    }

    await prisma.registroResiduo.delete({ where: { id: params.id } });

    return NextResponse.json({ ok: true });
  } catch (error: any) {
    console.error("DELETE /api/residuos/[id] error:", error);
    return NextResponse.json({ error: error?.message || "Erro ao remover resíduo" }, { status: 500 });
  }
}
