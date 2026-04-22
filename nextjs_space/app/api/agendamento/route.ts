import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const agendamentos = await prisma.agendamento.findMany({
      include: {
        equipamento: true,
        usuario: { select: { id: true, name: true, email: true } },
      },
      orderBy: { dataInicio: 'asc' },
    });

    return NextResponse.json(agendamentos);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Erro ao buscar agendamentos" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Não autenticado" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    const body = await request.json();
    const { equipamentoId, dataInicio, dataFim, observacoes } = body;

    if (user?.category === "IC") {
      return NextResponse.json({ error: "Permissão negada" }, { status: 403 });
    }

    if (user?.category !== "Admin") {
      const autorizacao = await prisma.autorizacaoEquipamento.findUnique({
        where: { usuarioId_equipamentoId: { usuarioId: session.user.id, equipamentoId } },
      });

      if (!autorizacao?.autorizado) {
        return NextResponse.json(
          { error: "Você não está autorizado a agendar este equipamento" },
          { status: 403 }
        );
      }
    }

    const agendamento = await prisma.agendamento.create({
      data: {
        equipamentoId,
        usuarioId: session.user.id,
        dataInicio: new Date(dataInicio),
        dataFim: new Date(dataFim),
        observacoes,
      },
      include: { equipamento: true, usuario: true },
    });

    return NextResponse.json(agendamento, { status: 201 });
  } catch (error: any) {
    console.error("Agendamento POST error:", error);
    return NextResponse.json(
      { error: error?.message || "Erro ao criar agendamento" },
      { status: 500 }
    );
  }
}