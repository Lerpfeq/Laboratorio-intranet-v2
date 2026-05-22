import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET - Buscar agendamento por ID
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { id } = await params;
    const agendamento = await prisma.agendamento.findUnique({
      where: { id },
      include: {
        equipamento: true,
        usuario: { select: { id: true, name: true, email: true } },
        paraUsuarioInterno: { select: { id: true, name: true, email: true } },
      },
    });

    if (!agendamento) {
      return NextResponse.json({ error: 'Agendamento não encontrado' }, { status: 404 });
    }

    return NextResponse.json(agendamento);
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// DELETE - Excluir agendamento
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const { id } = await params;
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    const isAdmin = user?.category === 'Admin';

    const agendamento = await prisma.agendamento.findUnique({ where: { id } });
    if (!agendamento) {
      return NextResponse.json({ error: 'Agendamento não encontrado' }, { status: 404 });
    }

    // Pode excluir: admin, quem criou, ou responsável do equipamento
    const canDelete =
      isAdmin ||
      agendamento.userId === session.user.id ||
      !!(await prisma.autorizacaoEquipamento.findFirst({
        where: {
          equipamentoId: agendamento.equipamentoId,
          userId: session.user.id,
          tipo: 'RESPONSAVEL',
        },
      }));

    if (!canDelete) {
      return NextResponse.json({ error: 'Sem permissão para excluir' }, { status: 403 });
    }

    await prisma.agendamento.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
