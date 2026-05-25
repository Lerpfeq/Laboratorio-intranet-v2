import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendAgendamentoEmails } from '@/lib/email/agendamento-email';

export const dynamic = 'force-dynamic';

// GET - List bookings (com filtros)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const equipamentoId = searchParams.get('equipamentoId');
    const startDate = searchParams.get('start');
    const endDate = searchParams.get('end');

    const where: any = {};
    if (equipamentoId) where.equipamentoId = equipamentoId;
    if (startDate || endDate) {
      where.inicio = {};
      if (startDate) where.inicio.gte = new Date(startDate);
      if (endDate) where.fim = { lte: new Date(endDate) };
    }

    const bookings = await prisma.agendamento.findMany({
      where,
      include: {
        equipamento: true,
        usuario: { select: { id: true, name: true, email: true } },
        paraUsuarioInterno: { select: { id: true, name: true, email: true } },
      },
      orderBy: { inicio: 'asc' },
    });

    return NextResponse.json(bookings);
  } catch (error: any) {
    console.error('Agendamentos GET error:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// POST - Create booking
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 });
    }

    const body = await request.json();
    const {
      equipamentoId,
      paraQuem, // 'eu' | 'interno' | 'externo'
      paraUsuarioInternoId,
      paraUsuarioExterno,
      emailExterno,
      emailOrientador,
      inicio,
      fim,
      observacoes,
    } = body;

    // Basic validations
    if (!equipamentoId) {
      return NextResponse.json({ error: 'Equipment is required' }, { status: 400 });
    }
    if (!inicio || !fim) {
      return NextResponse.json({ error: 'Start and end times are required' }, { status: 400 });
    }

    const inicioDate = new Date(inicio);
    const fimDate = new Date(fim);

    if (fimDate <= inicioDate) {
      return NextResponse.json({ error: 'End time must be after start time' }, { status: 400 });
    }

    // Check if equipment existe
    const equipamento = await prisma.equipamento.findUnique({
      where: { id: equipamentoId },
      include: {
        autorizacoes: {
          where: { tipo: 'RESPONSAVEL' },
          include: { user: { select: { email: true, name: true } } },
        },
      },
    });

    if (!equipamento) {
      return NextResponse.json({ error: 'Equipment not found' }, { status: 404 });
    }

    // Verificar authorization (Admin pode sempre, outros precisam authorization)
    if (user.category !== 'Admin') {
      const autorizacao = await prisma.autorizacaoEquipamento.findFirst({
        where: { equipamentoId, userId: session.user.id },
      });
      if (!autorizacao) {
        return NextResponse.json(
          { error: 'You are not authorized to book this equipment' },
          { status: 403 }
        );
      }
    }

    // External user validation
    if (paraQuem === 'externo') {
      if (!paraUsuarioExterno?.trim()) {
        return NextResponse.json({ error: 'External user name is required' }, { status: 400 });
      }
      if (!emailExterno?.trim()) {
        return NextResponse.json({ error: 'External user email is required' }, { status: 400 });
      }
      if (!emailOrientador?.trim()) {
        return NextResponse.json({ error: 'Advisor email is required for external users' }, { status: 400 });
      }
    }

    if (paraQuem === 'interno' && !paraUsuarioInternoId) {
      return NextResponse.json({ error: 'Please select an internal user' }, { status: 400 });
    }

    // Check time overlap
    const overlap = await prisma.agendamento.findFirst({
      where: {
        equipamentoId,
        OR: [
          { inicio: { lt: fimDate }, fim: { gt: inicioDate } },
        ],
      },
    });

    if (overlap) {
      return NextResponse.json(
        { error: 'This time slot is already booked for this equipment' },
        { status: 409 }
      );
    }

    // Criar booking
    const booking = await prisma.agendamento.create({
      data: {
        equipamentoId,
        userId: session.user.id,
        paraUsuarioInternoId: paraQuem === 'interno' ? paraUsuarioInternoId : null,
        paraUsuarioExterno: paraQuem === 'externo' ? paraUsuarioExterno?.trim() : null,
        emailExterno: paraQuem === 'externo' ? emailExterno?.trim() : null,
        emailOrientador: paraQuem === 'externo' ? emailOrientador?.trim() : null,
        inicio: inicioDate,
        fim: fimDate,
        observacoes: observacoes?.trim() || null,
      },
      include: {
        equipamento: true,
        usuario: { select: { id: true, name: true, email: true } },
        paraUsuarioInterno: { select: { id: true, name: true, email: true } },
      },
    });

    // Determine target user
    let paraQuemNome = user.name || user.email || 'Desconhecido';
    let paraQuemEmail = user.email || '';
    const isExterno = paraQuem === 'externo';

    if (paraQuem === 'interno' && booking.paraUsuarioInterno) {
      paraQuemNome = booking.paraUsuarioInterno.name || booking.paraUsuarioInterno.email || 'Interno';
      paraQuemEmail = booking.paraUsuarioInterno.email || '';
    } else if (isExterno) {
      paraQuemNome = paraUsuarioExterno || 'Externo';
      paraQuemEmail = emailExterno || '';
    }

    // ── EMAIL: Fire-and-forget ──
    // Booking is already saved in DB above — email is just a notification.
    // NEVER await here: if SMTP is slow/down the user would stare at "Saving..." forever.
    const responsavelEmails = equipamento.autorizacoes
      .map((a) => a.user.email)
      .filter(Boolean) as string[];

    const formatDate = (d: Date) =>
      d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

    const emailPayload = {
      equipamentoNome: equipamento.nome,
      sopLink: equipamento.sopLink,
      inicio: formatDate(inicioDate),
      fim: formatDate(fimDate),
      criadoPor: user.name || 'No name',
      criadoPorEmail: user.email || '',
      paraQuem: paraQuemNome,
      paraQuemEmail,
      emailOrientador: emailOrientador?.trim() || null,
      observacoes: observacoes?.trim() || null,
      inicioRaw: inicioDate.toISOString(),
      fimRaw: fimDate.toISOString(),
    };

    console.log('[Agendamento] 📧 Queuing email (fire-and-forget)...');
    console.log('[Agendamento] paraQuem:', paraQuem, '| isExterno:', isExterno);
    console.log('[Agendamento] paraQuemEmail:', paraQuemEmail);

    // Fire-and-forget: NO await — response returns immediately
    sendAgendamentoEmails(emailPayload, responsavelEmails, isExterno)
      .then(() => console.log('[Agendamento] ✅ Email delivery completed in background'))
      .catch((err) => console.error('[Agendamento] ❌ Email delivery failed in background:', err));

    // Return response IMMEDIATELY — user sees success right away
    return NextResponse.json(booking, { status: 201 });
  } catch (error: any) {
    console.error('Agendamentos POST error:', error);
    return NextResponse.json({ error: error.message || 'Internal error' }, { status: 500 });
  }
}
