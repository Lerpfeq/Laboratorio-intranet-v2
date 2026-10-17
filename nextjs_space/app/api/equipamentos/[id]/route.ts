import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { assocSelect, mesclarAssociados } from '@/lib/equipamento-associados';

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
        ...assocSelect,
      },
    });

    if (!equipment) {
      return NextResponse.json({ error: 'Equipment not found' }, { status: 404 });
    }

    return NextResponse.json(mesclarAssociados(equipment));
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

    const { nome, descricao, sopLink, equipamentosAssociados } = await request.json();

    const data: any = {
      nome: nome?.trim(),
      descricao: descricao?.trim() || null,
      sopLink: sopLink?.trim() || null,
    };

    // Only admins can manage equipment associations
    if (isAdmin && Array.isArray(equipamentosAssociados)) {
      // Associações simétricas: aplicamos a mesma lista nos dois lados da relação.
      // - equipamentosAssociados: vínculos A -> B
      // - associadoPor: vínculos B -> A (conecta A em B ao marcar; desconecta ao desmarcar)
      const ids = Array.from(
        new Set<string>(equipamentosAssociados.filter((assocId: string) => assocId && assocId !== id))
      ).map((assocId) => ({ id: assocId }));
      data.equipamentosAssociados = { set: ids };
      data.associadoPor = { set: ids };
    }

    const equipment = await prisma.equipamento.update({
      where: { id },
      data,
      include: assocSelect,
    });

    return NextResponse.json(mesclarAssociados(equipment));
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
