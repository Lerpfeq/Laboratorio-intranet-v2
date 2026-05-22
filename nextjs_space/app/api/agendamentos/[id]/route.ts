import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET - Buscar booking por ID
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
    const booking = await prisma.agendamento.findUnique({
      where: { id },
      include: {
        equipamento: true,
        usuario: { select: { id: true, name: true, email: true } },
        paraUsuarioInterno: { select: { id: true, name: true, email: true } },
      },
    });

    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    return NextResponse.json(booking);
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// DELETE - Delete booking
export async function DELETE(
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

    const booking = await prisma.agendamento.findUnique({ where: { id } });
    if (!booking) {
      return NextResponse.json({ error: 'Booking not found' }, { status: 404 });
    }

    // Can delete: admin, creator, or equipment manager
    const canDelete =
      isAdmin ||
      booking.userId === session.user.id ||
      !!(await prisma.autorizacaoEquipamento.findFirst({
        where: {
          equipamentoId: booking.equipamentoId,
          userId: session.user.id,
          tipo: 'RESPONSAVEL',
        },
      }));

    if (!canDelete) {
      return NextResponse.json({ error: 'No permission to delete' }, { status: 403 });
    }

    await prisma.agendamento.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
