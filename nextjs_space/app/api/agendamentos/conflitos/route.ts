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

    // Fetch the equipment and its associated equipment (both directions)
    const equipment = await prisma.equipamento.findUnique({
      where: { id: equipamentoId },
      include: {
        equipamentosAssociados: { select: { id: true, nome: true } },
        associadoPor: { select: { id: true, nome: true } },
      },
    });

    if (!equipment) {
      return NextResponse.json({ conflitos: [] });
    }

    // Step 1: direct associations (both directions)
    const directAssoc = [
      ...equipment.equipamentosAssociados,
      ...equipment.associadoPor,
    ];

    if (directAssoc.length === 0) {
      return NextResponse.json({ conflitos: [] });
    }

    // Step 2: find "sibling" equipment — equipment that share at least one
    // of the same dependencies as the equipment being booked.
    // Example: A→C and B→C → when booking A, also warn if B is booked
    // (because B is occupying C, which A also needs).
    const directAssocIds = directAssoc.map((a) => a.id);

    const siblings = await prisma.equipamento.findMany({
      where: {
        id: { not: equipamentoId },
        OR: [
          // shares a dependency: has any of our direct deps as its own dep
          { equipamentosAssociados: { some: { id: { in: directAssocIds } } } },
          // or is depended upon by any of our direct deps
          { associadoPor: { some: { id: { in: directAssocIds } } } },
        ],
      },
      select: { id: true, nome: true },
    });

    // Build final candidate set: direct assoc + siblings (no duplicates, no self)
    const candidateMap = new Map<string, string>();
    for (const eq of [...directAssoc, ...siblings]) {
      if (eq.id !== equipamentoId) candidateMap.set(eq.id, eq.nome);
    }

    const candidateIds = [...candidateMap.keys()];

    // Step 3: check for overlapping bookings among all candidates
    // Overlap condition: booking.inicio < fim AND booking.fim > inicio
    const agendamentosConflito = await prisma.agendamento.findMany({
      where: {
        equipamentoId: { in: candidateIds },
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
      const bookedBy = ag.usuario?.name || ag.usuario?.email || 'Unknown';
      const forWhom = ag.paraUsuarioInterno
        ? ` (for ${ag.paraUsuarioInterno.name || ag.paraUsuarioInterno.email})`
        : ag.paraUsuarioExterno
        ? ` (for ${ag.paraUsuarioExterno})`
        : '';

      return {
        equipamentoId: ag.equipamentoId,
        equipamentoNome: ag.equipamento?.nome || '',
        agendadoPor: bookedBy + forWhom,
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
