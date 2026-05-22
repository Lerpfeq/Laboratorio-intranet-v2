import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { sendAgendamentoEmails } from '@/lib/email/agendamento-email';

export const dynamic = 'force-dynamic';

// GET - Listar agendamentos (com filtros)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
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

    const agendamentos = await prisma.agendamento.findMany({
      where,
      include: {
        equipamento: true,
        usuario: { select: { id: true, name: true, email: true } },
        paraUsuarioInterno: { select: { id: true, name: true, email: true } },
      },
      orderBy: { inicio: 'asc' },
    });

    return NextResponse.json(agendamentos);
  } catch (error: any) {
    console.error('Agendamentos GET error:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// POST - Criar agendamento
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (!user) {
      return NextResponse.json({ error: 'Usuário não encontrado' }, { status: 404 });
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

    // Validações básicas
    if (!equipamentoId) {
      return NextResponse.json({ error: 'Equipamento é obrigatório' }, { status: 400 });
    }
    if (!inicio || !fim) {
      return NextResponse.json({ error: 'Início e fim são obrigatórios' }, { status: 400 });
    }

    const inicioDate = new Date(inicio);
    const fimDate = new Date(fim);

    if (fimDate <= inicioDate) {
      return NextResponse.json({ error: 'Fim deve ser posterior ao início' }, { status: 400 });
    }

    // Verificar se equipamento existe
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
      return NextResponse.json({ error: 'Equipamento não encontrado' }, { status: 404 });
    }

    // Verificar autorização (Admin pode sempre, outros precisam autorização)
    if (user.category !== 'Admin') {
      const autorizacao = await prisma.autorizacaoEquipamento.findFirst({
        where: { equipamentoId, userId: session.user.id },
      });
      if (!autorizacao) {
        return NextResponse.json(
          { error: 'Você não está autorizado a agendar este equipamento' },
          { status: 403 }
        );
      }
    }

    // Validação externo
    if (paraQuem === 'externo') {
      if (!paraUsuarioExterno?.trim()) {
        return NextResponse.json({ error: 'Nome do usuário externo é obrigatório' }, { status: 400 });
      }
      if (!emailExterno?.trim()) {
        return NextResponse.json({ error: 'Email do usuário externo é obrigatório' }, { status: 400 });
      }
      if (!emailOrientador?.trim()) {
        return NextResponse.json({ error: 'Email do orientador é obrigatório para externos' }, { status: 400 });
      }
    }

    if (paraQuem === 'interno' && !paraUsuarioInternoId) {
      return NextResponse.json({ error: 'Selecione o usuário interno' }, { status: 400 });
    }

    // Verificar sobreposição de horário
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
        { error: 'Já existe um agendamento neste horário para este equipamento' },
        { status: 409 }
      );
    }

    // Criar agendamento
    const agendamento = await prisma.agendamento.create({
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

    // Determinar "para quem"
    let paraQuemNome = user.name || user.email || 'Desconhecido';
    let paraQuemEmail = user.email || '';
    const isExterno = paraQuem === 'externo';

    if (paraQuem === 'interno' && agendamento.paraUsuarioInterno) {
      paraQuemNome = agendamento.paraUsuarioInterno.name || agendamento.paraUsuarioInterno.email || 'Interno';
      paraQuemEmail = agendamento.paraUsuarioInterno.email || '';
    } else if (isExterno) {
      paraQuemNome = paraUsuarioExterno || 'Externo';
      paraQuemEmail = emailExterno || '';
    }

    // Enviar emails (assíncrono - não bloqueia)
    const responsavelEmails = equipamento.autorizacoes
      .map((a) => a.user.email)
      .filter(Boolean) as string[];

    const formatDate = (d: Date) =>
      d.toLocaleString('pt-BR', { timeZone: 'America/Sao_Paulo' });

    sendAgendamentoEmails(
      {
        equipamentoNome: equipamento.nome,
        sopLink: equipamento.sopLink,
        inicio: formatDate(inicioDate),
        fim: formatDate(fimDate),
        criadoPor: user.name || 'Sem nome',
        criadoPorEmail: user.email || '',
        paraQuem: paraQuemNome,
        paraQuemEmail,
        emailOrientador: emailOrientador?.trim() || null,
        observacoes: observacoes?.trim() || null,
      },
      responsavelEmails,
      isExterno
    );

    return NextResponse.json(agendamento, { status: 201 });
  } catch (error: any) {
    console.error('Agendamentos POST error:', error);
    return NextResponse.json({ error: error.message || 'Erro interno' }, { status: 500 });
  }
}
