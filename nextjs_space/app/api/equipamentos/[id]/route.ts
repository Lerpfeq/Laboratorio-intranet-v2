import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET - Buscar equipment por ID
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
    const equipment = await prisma.equipamento.findUnique({
      where: { id },
      include: {
        autorizacoes: {
          include: {
            user: { select: { id: true, name: true, email: true } },
          },
        },
      },
    });

    if (!equipment) {
      return NextResponse.json({ error: 'Equipment not found' }, { status: 404 });
    }

    return NextResponse.json(equipment);
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// PUT - Update equipment
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { id } = await params;
    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    const isAdmin = user?.category === 'Admin';

    if (!isAdmin) {
      const autorizacao = await prisma.autorizacaoEquipamento.findFirst({
        where: { equipamentoId: id, userId: session.user.id, tipo: 'RESPONSAVEL' },
      });
      if (!autorizacao) {
        return NextResponse.json({ error: 'No permission' }, { status: 403 });
      }
    }

    const { nome, descricao, sopLink } = await request.json();

    const equipment = await prisma.equipamento.update({
      where: { id },
      data: {
        nome: nome?.trim(),
        descricao: descricao?.trim() || null,
        sopLink: sopLink?.trim() || null,
      },
    });

    return NextResponse.json(equipment);
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// DELETE - Delete equipment (Admin only)
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
    if (user?.category !== 'Admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const { id } = await params;
    await prisma.equipamento.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
