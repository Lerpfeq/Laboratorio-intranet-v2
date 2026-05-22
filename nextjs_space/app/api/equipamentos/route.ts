import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// GET - List equipments (filtered by permission)
export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const userId = session.user.id;
    const user = await prisma.user.findUnique({ where: { id: userId } });
    const isAdmin = user?.category === 'Admin';

    if (isAdmin) {
      const equipments = await prisma.equipamento.findMany({
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
      return NextResponse.json(equipments);
    } else {
      // Regular user - only sees authorized equipment
      const equipments = await prisma.equipamento.findMany({
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
      return NextResponse.json(equipments);
    }
  } catch (error: any) {
    console.error('Error fetching equipments:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}

// POST - Create equipment (Admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (user?.category !== 'Admin') {
      return NextResponse.json({ error: 'Admin only' }, { status: 403 });
    }

    const { nome, descricao, sopLink } = await request.json();

    if (!nome?.trim()) {
      return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    }

    const equipment = await prisma.equipamento.create({
      data: { nome: nome.trim(), descricao: descricao?.trim() || null, sopLink: sopLink?.trim() || null },
    });

    return NextResponse.json(equipment, { status: 201 });
  } catch (error: any) {
    console.error('Error creating equipment:', error);
    return NextResponse.json({ error: 'Internal error' }, { status: 500 });
  }
}
