import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import {
  CLASSE_RESIDUO_VALUES,
  ESTADO_RESIDUO_VALUES,
  ResiduoPayload,
} from "@/lib/residuos";
import { gerarEtiquetaInterna } from "@/lib/residuos-docs";

export const dynamic = "force-dynamic";

function toNumberOrNull(value: unknown): number | null {
  if (value === null || value === undefined || value === "") return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeResiduoPayload(body: any): ResiduoPayload {
  return {
    composicao: String(body?.composicao || "").trim(),
    classe: body?.classe,
    estado: body?.estado,
    tipoRecipiente: String(body?.tipoRecipiente || "").trim(),
    volumeRecipienteLitros: Number(body?.volumeRecipienteLitros),
    responsavel: String(body?.responsavel || "").trim(),
    departamento: String(body?.departamento || "").trim(),
    data: body?.data,
    ph: toNumberOrNull(body?.ph),
    observacoes: String(body?.observacoes || "").trim(),
    halogenadosPercentual: toNumberOrNull(body?.halogenadosPercentual),
    acetonitrilaPercentual: toNumberOrNull(body?.acetonitrilaPercentual),
    metaisPesadosPercentual: toNumberOrNull(body?.metaisPesadosPercentual),
    presencaEnxofre: Boolean(body?.presencaEnxofre),
    geradorCianetos: Boolean(body?.geradorCianetos),
    aminas: Boolean(body?.aminas),
  };
}

function validateResiduoPayload(payload: ResiduoPayload): string | null {
  if (!payload.composicao) return "Composição é obrigatória";
  if (!CLASSE_RESIDUO_VALUES.includes(payload.classe)) return "Classe inválida";
  if (!ESTADO_RESIDUO_VALUES.includes(payload.estado)) return "Estado inválido";
  if (!payload.tipoRecipiente) return "Tipo de recipiente é obrigatório";
  if (!Number.isFinite(payload.volumeRecipienteLitros) || payload.volumeRecipienteLitros <= 0) {
    return "Volume do recipiente deve ser maior que zero";
  }
  if (!payload.responsavel) return "Responsável é obrigatório";
  if (!payload.departamento) return "Departamento é obrigatório";

  return null;
}

async function getAuthedUser() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return { error: "Não autenticado", status: 401 as const };

  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  if (!user) return { error: "Usuário não encontrado", status: 404 as const };
  if (user.category === "IC") return { error: "Permissão negada", status: 403 as const };

  return { session, user };
}

export async function GET(request: NextRequest) {
  try {
    const auth = await getAuthedUser();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const isAdmin = auth.user.category === "Admin";
    const searchParams = request.nextUrl.searchParams;
    const q = searchParams.get("q")?.trim();

    const residuos = await prisma.registroResiduo.findMany({
      where: {
        ...(isAdmin ? {} : { usuarioId: auth.user.id }),
        ...(q
          ? {
              OR: [
                { composicao: { contains: q, mode: "insensitive" } },
                { departamento: { contains: q, mode: "insensitive" } },
                { responsavel: { contains: q, mode: "insensitive" } },
              ],
            }
          : {}),
      },
      include: {
        usuario: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: [{ createdAt: "desc" }],
    });

    return NextResponse.json(residuos);
  } catch (error: any) {
    console.error("GET /api/residuos error:", error);
    return NextResponse.json({ error: error?.message || "Erro ao listar resíduos" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const auth = await getAuthedUser();
    if ("error" in auth) {
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    }

    const payload = normalizeResiduoPayload(await request.json());
    const validationError = validateResiduoPayload(payload);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }

    const maxRegistro = await prisma.registroResiduo.findFirst({
      select: { numeroRecipiente: true },
      orderBy: { numeroRecipiente: "desc" },
    });

    const numeroRecipiente = (maxRegistro?.numeroRecipiente || 0) + 1;

    const residuo = await prisma.registroResiduo.create({
      data: {
        usuarioId: auth.user.id,
        numeroRecipiente,
        composicao: payload.composicao,
        classe: payload.classe,
        estado: payload.estado,
        tipoRecipiente: payload.tipoRecipiente,
        volumeRecipienteLitros: payload.volumeRecipienteLitros,
        responsavel: payload.responsavel,
        departamento: payload.departamento,
        data: payload.data ? new Date(payload.data) : new Date(),
        ph: payload.ph,
        observacoes: payload.observacoes || null,
        halogenadosPercentual: payload.halogenadosPercentual,
        acetonitrilaPercentual: payload.acetonitrilaPercentual,
        metaisPesadosPercentual: payload.metaisPesadosPercentual,
        presencaEnxofre: payload.presencaEnxofre ?? false,
        geradorCianetos: payload.geradorCianetos ?? false,
        aminas: payload.aminas ?? false,
      },
      include: {
        usuario: {
          select: { id: true, name: true, email: true },
        },
      },
    });

    const pdfBuffer = await gerarEtiquetaInterna(residuo as any);

    return NextResponse.json(
      {
        success: true,
        residuo,
        etiquetaPDF: pdfBuffer.toString("base64"),
        // Compatibilidade com frontend atual
        etiquetaPdfBase64: pdfBuffer.toString("base64"),
        etiquetaFileName: `etiqueta-residuo-${residuo.numeroRecipiente}.pdf`,
      },
      { status: 201 }
    );
  } catch (error: any) {
    console.error("POST /api/residuos error:", error);
    return NextResponse.json({ error: error?.message || "Erro ao criar resíduo" }, { status: 500 });
  }
}
