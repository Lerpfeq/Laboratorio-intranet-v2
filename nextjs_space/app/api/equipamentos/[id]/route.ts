import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET - Buscar equipamento por ID
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
    const equipamento = await prisma.equipamento.findUnique({
      where: { id },
      include: {
        autorizacoes: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    if (!equipamento) {
      return NextResponse.json({ error: 'Equipamento não encontrado' }, { status: 404 });
    }

    return NextResponse.json(equipamento);
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// PUT - Atualizar equipamento
export async function PUT(
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

    if (!isAdmin) {
      const autorizacao = await prisma.autorizacaoEquipamento.findFirst({
        where: { equipamentoId: id, userId: session.user.id, tipo: 'RESPONSAVEL' },
      });
      if (!autorizacao) {
        return NextResponse.json({ error: 'Sem permissão' }, { status: 403 });
      }
    }

    const { nome, descricao, sopLink } = await request.json();

    const equipamento = await prisma.equipamento.update({
      where: { id },
      data: {
        nome: nome?.trim(),
        descricao: descricao?.trim() || null,
        sopLink: sopLink?.trim() || null,
      },
    });

    return NextResponse.json(equipamento);
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// DELETE - Excluir equipamento (Admin only)
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (user?.category !== 'Admin') {
      return NextResponse.json({ error: 'Apenas administradores' }, { status: 403 });
    }

    const { id } = await params;
    await prisma.equipamento.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
