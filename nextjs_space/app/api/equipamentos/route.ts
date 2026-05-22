import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET - Listar equipamentos (filtrado por permissão)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const userId = session.user.id;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const isAdmin = user?.category === 'Admin';

    if (isAdmin) {
      const equipamentos = await prisma.equipamento.findMany({
        include: {
          autorizacoes: {
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
          },
          _count: { select: { agendamentos: true } },
        },
        orderBy: { nome: 'asc' },
      });
      return NextResponse.json(equipamentos);
    } else {
      // Usuário comum vê apenas onde tem autorização
      const equipamentos = await prisma.equipamento.findMany({
        where: {
          autorizacoes: { some: { userId } },
        },
        include: {
          autorizacoes: {
            include: {
              user: { select: { id: true, name: true, email: true } },
            },
          },
        },
        orderBy: { nome: 'asc' },
      });
      return NextResponse.json(equipamentos);
    }
  } catch (error: any) {
    console.error('Error fetching equipamentos:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}

// POST - Criar equipamento (Admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autenticado' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (user?.category !== 'Admin') {
      return NextResponse.json({ error: 'Apenas administradores' }, { status: 403 });
    }

    const { nome, descricao, sopLink } = await request.json();

    if (!nome?.trim()) {
      return NextResponse.json({ error: 'Nome é obrigatório' }, { status: 400 });
    }

    const equipamento = await prisma.equipamento.create({
      data: { nome: nome.trim(), descricao: descricao?.trim() || null, sopLink: sopLink?.trim() || null },
    });

    return NextResponse.json(equipamento, { status: 201 });
  } catch (error: any) {
    console.error('Error creating equipamento:', error);
    return NextResponse.json({ error: 'Erro interno' }, { status: 500 });
  }
}
