import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Os 4 códigos ainda faltando
const MISSING = ['LERP-J2252', 'LERP-9888', 'LERP-6204', 'LERP-2404'];

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (user?.category !== 'Admin') {
      return NextResponse.json({ error: 'Forbidden - Admin only' }, { status: 403 });
    }

    const results: any[] = [];

    for (const codigo of MISSING) {
      // Extrair parte numérica
      const numPart = codigo.replace('LERP-', '').replace(/^[A-Z]+/, '');
      const letterPart = codigo.replace('LERP-', '').replace(/[0-9]+$/, '');

      // Buscar códigos similares
      const similar = await prisma.reagenteEntrada.findMany({
        where: {
          OR: [
            // Mesma sequência numérica
            { codigoInterno: { contains: numPart } },
            // Mesma letra inicial + números parecidos
            ...(letterPart
              ? [
                  { codigoInterno: { startsWith: `LERP-${letterPart}` } },
                ]
              : []),
          ],
        },
        select: {
          codigoInterno: true,
          reagente: { select: { nome: true } },
        },
        take: 10,
      });

      results.push({
        original: codigo,
        numPart,
        letterPart: letterPart || '(none)',
        similarCount: similar.length,
        similar: similar.map((s) => ({
          code: s.codigoInterno,
          name: s.reagente?.nome || 'N/A',
        })),
      });
    }

    return NextResponse.json({
      success: true,
      results,
    });
  } catch (error: any) {
    console.error('❌ Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
