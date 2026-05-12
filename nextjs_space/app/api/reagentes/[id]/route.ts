import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Não autorizado' }, { status: 401 });
    }

    const entrada = await prisma.reagenteEntrada.findUnique({
      where: { id: params.id },
      select: {
        id: true,
        codigoInterno: true,
      },
    });

    if (!entrada) {
      return NextResponse.json({ error: 'Frasco não encontrado' }, { status: 404 });
    }

    return NextResponse.json({
      success: true,
      reagente: {
        id: entrada.id,
        codigo: entrada.codigoInterno,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || 'Erro ao buscar reagente' },
      { status: 500 }
    );
  }
}
