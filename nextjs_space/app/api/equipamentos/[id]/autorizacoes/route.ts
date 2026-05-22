import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET - List authorizations for an equipment
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const autorizacoes = await prisma.autorizacaoEquipamento.findMany({
      where: { equipamentoId: id },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(autorizacoes);
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// POST - Add authorization
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    const { id } = await params;
    const isAdmin = user?.category === 'Admin';

    if (!isAdmin) {
      const isResponsavel = await prisma.autorizacaoEquipamento.findFirst({
        where: { equipamentoId: id, userId: session.user.id, tipo: 'RESPONSAVEL' },
      });
      if (!isResponsavel) {
        return NextResponse.json({ error: 'No permission' }, { status: 403 });
      }
    }

    const { userId, tipo } = await request.json();

    if (!userId || !tipo) {
      return NextResponse.json({ error: 'userId and tipo are required' }, { status: 400 });
    }

    if (!['RESPONSAVEL', 'TREINADO'].includes(tipo)) {
      return NextResponse.json({ error: 'Tipo deve ser RESPONSAVEL ou TREINADO' }, { status: 400 });
    }

    // Check if user existe
    const targetUser = await prisma.user.findUnique({ where: { id: userId } });
    if (!targetUser) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const autorizacao = await prisma.autorizacaoEquipamento.upsert({
      where: {
        userId_equipamentoId_tipo: { userId, equipamentoId: id, tipo },
      },
      update: {},
      create: { userId, equipamentoId: id, tipo },
      include: {
        user: { select: { id: true, name: true, email: true } },
      },
    });

    return NextResponse.json(autorizacao, { status: 201 });
  } catch (error: any) {
    console.error('Error creating autorizacao:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// DELETE - Remove authorization
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    const { id } = await params;
    const isAdmin = user?.category === 'Admin';

    if (!isAdmin) {
      const isResponsavel = await prisma.autorizacaoEquipamento.findFirst({
        where: { equipamentoId: id, userId: session.user.id, tipo: 'RESPONSAVEL' },
      });
      if (!isResponsavel) {
        return NextResponse.json({ error: 'No permission' }, { status: 403 });
      }
    }

    const { searchParams } = new URL(request.url);
    const autorizacaoId = searchParams.get('autorizacaoId');

    if (!autorizacaoId) {
      return NextResponse.json({ error: 'autorizacaoId is required' }, { status: 400 });
    }

    await prisma.autorizacaoEquipamento.delete({
      where: { id: autorizacaoId },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
