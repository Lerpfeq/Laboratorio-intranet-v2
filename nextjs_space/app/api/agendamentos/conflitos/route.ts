import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

/**
 * GET /api/agendamentos/conflitos
 * Check if any equipment associated with the given equipment has overlapping bookings.
 *
 * Query params:
 *   equipamentoId - the equipment being booked
 *   inicio        - ISO datetime string for start
 *   fim           - ISO datetime string for end
 *
 * Returns: { conflitos: [{ equipamentoId, equipamentoNome, agendadoPor, inicio, fim }] }
 */
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const equipamentoId = searchParams.get('equipamentoId');
    const inicioStr = searchParams.get('inicio');
    const fimStr = searchParams.get('fim');

    if (!equipamentoId || !inicioStr || !fimStr) {
      return NextResponse.json({ error: 'equipamentoId, inicio, fim are required' }, { status: 400 });
    }

    const inicio = new Date(inicioStr);
    const fim = new Date(fimStr);

    if (isNaN(inicio.getTime()) || isNaN(fim.getTime()) || fim <= inicio) {
      return NextResponse.json({ error: 'Invalid time range' }, { status: 400 });
    }

    // Fetch the equipment and its associated equipment
    const equipment = await prisma.equipamento.findUnique({
      where: { id: equipamentoId },
      include: {
        equipamentosAssociados: { select: { id: true, nome: true } },
        // Also include reverse: equipment that this one is associated WITH
        associadoPor: { select: { id: true, nome: true } },
      },
    });

    if (!equipment) {
      return NextResponse.json({ conflitos: [] });
    }

    // Combine both directions of the association
    const associados = [
      ...equipment.equipamentosAssociados,
      ...equipment.associadoPor,
    ];

    if (associados.length === 0) {
      return NextResponse.json({ conflitos: [] });
    }

    const associadosIds = associados.map((a) => a.id);

    // Find overlapping bookings for associated equipment
    // Overlap condition: booking.inicio < fim AND booking.fim > inicio
    const agendamentosConflito = await prisma.agendamento.findMany({
      where: {
        equipamentoId: { in: associadosIds },
        inicio: { lt: fim },
        fim: { gt: inicio },
      },
      include: {
        equipamento: { select: { id: true, nome: true } },
        usuario: { select: { name: true, email: true } },
        paraUsuarioInterno: { select: { name: true, email: true } },
      },
    });

    const conflitos = agendamentosConflito.map((ag) => {
      const agendadoPor = ag.usuario?.name || ag.usuario?.email || 'Unknown';
      const para = ag.paraUsuarioInterno
        ? ` (para ${ag.paraUsuarioInterno.name || ag.paraUsuarioInterno.email})`
        : ag.paraUsuarioExterno
        ? ` (para ${ag.paraUsuarioExterno})`
        : '';

      return {
        equipamentoId: ag.equipamentoId,
        equipamentoNome: ag.equipamento?.nome || '',
        agendadoPor: agendadoPor + para,
        inicio: ag.inicio.toISOString(),
        fim: ag.fim.toISOString(),
      };
    });

    return NextResponse.json({ conflitos });
  } catch (error: any) {
    console.error('Error checking conflicts:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
