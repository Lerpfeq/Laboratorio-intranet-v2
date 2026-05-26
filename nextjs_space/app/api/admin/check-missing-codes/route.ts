import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';

export const dynamic = 'force-dynamic';

// Mesma lista do endpoint de update
const CODES = [
  'LERP-C1553', 'LERP-D3295', 'LERP-J1689', 'LERP-T7844', 'LERP-D9701',
  'LERP-G1499', 'LERP-X4518', 'LERP-H1610', 'LERP-F2601', 'LERP-C9295',
  'LERP-L8356', 'LERP-M2634', 'LERP-F8265', 'LERP-V4777', 'LERP-Z9909',
  'LERP-M1231', 'LERP-W6595', 'LERP-C6963', 'LERP-O9620', 'LERP-Z1332',
  'LERP-J1800', 'LERP-F7928', 'LERP-L8769', 'LERP-U9004', 'LERP-N7424',
  'LERP-Z7315', 'LERP-Y9885', 'LERP-J1570', 'LERP-S1835', 'LERP-E5304',
  'LERP-V4098', 'LERP-B6455', 'LERP-J3350', 'LERP-S7054', 'LERP-W9605',
  'LERP-R3305', 'LERP-M4286', 'LERP-X3459', 'LERP-D5861', 'LERP-K3984',
  'LERP-X7943', 'LERP-E8024', 'LERP-P8701', 'LERP-S8851', 'LERP-K3470',
  'LERP-A5906', 'LERP-O1820', 'LERP-R9114', 'LERP-Z8484', 'LERP-F3823',
  'LERP-L2037', 'LERP-C8135', 'LERP-D7772', 'LERP-N3255', 'LERP-T2040',
  'LERP-N8864', 'LERP-I2150', 'LERP-P1534', 'LERP-B9140', 'LERP-D1930',
  'LERP-Y4056', 'LERP-H4056', 'LERP-S6115', 'LERP-R1563', 'LERP-N7450',
  'LERP-F4985', 'LERP-J2252', 'LERP-T1501', 'LERP-Y7274', 'LERP-S1181',
  'LERP-9888', 'LERP-D8562', 'LERP-O8304', 'LERP-C6176', 'LERP-J6295',
  'LERP-E2488', 'LERP-T8045', 'LERP-S7413', 'LERP-V6203', 'LERP-E5838',
  'LERP-M2147', 'LERP-R4524', 'LERP-A1933', 'LERP-J1393', 'LERP-6204',
  'LERP-S7713', 'LERP-C1944', 'LERP-2404', 'LERP-P3919', 'LERP-M5648',
  'LERP-V8120', 'LERP-E9864', 'LERP-B2129', 'LERP-U9381', 'LERP-C1945',
  'LERP-W5104', 'LERP-J1777', 'LERP-Y6219', 'LERP-E8926', 'LERP-H4059',
  'LERP-H4584', 'LERP-G7450', 'LERP-V539', 'LERP-F6537', 'LERP-L8995',
  'LERP-D9497', 'LERP-A1727', 'LERP-A8807', 'LERP-E9038', 'LERP-N1891',
  'LERP-Z9066', 'LERP-Q5635', 'LERP-G1141', 'LERP-D2117', 'LERP-M4255',
  'LERP-Y7504', 'LERP-F4938', 'LERP-V2388', 'LERP-E1131', 'LERP-A2226',
  'LERP-A7786', 'LERP-Z7132', 'LERP-N5115', 'LERP-B7391', 'LERP-N3242',
  'LERP-K5773', 'LERP-F4109', 'LERP-7390', 'LERP-E4900', 'LERP-P2794',
  'LERP-X2512', 'LERP-Y1783', 'LERP-Y1655', 'LERP-L6134', 'LERP-J4482',
  'LERP-J3116', 'LERP-O4602', 'LERP-Q6273', 'LERP-E7448', 'LERP-H2718',
  'LERP-L8599', 'LERP-G6091', 'LERP-Q2708', 'LERP-A9993', 'LERP-O3662',
  'LERP-I8211', 'LERP-Q6379', 'LERP-U4954', 'LERP-R4404', 'LERP-I5851',
  'LERP-R4049', 'LERP-07863', 'LERP-O8740', 'LERP-C5301', 'LERP-R2454',
  'LERP-X3786', 'LERP-T2711', 'LERP-L6742', 'LERP-D7112', 'LERP-O5386',
  'LERP-L9985', 'LERP-Q1833', 'LERP-T8318', 'LERP-D6983', 'LERP-S6546',
  'LERP-D7151', 'LERP-E6022', 'LERP-M1719', 'LERP-R5987', 'LERP-Q5178',
  'LERP-J1337', 'LERP-E7840', 'LERP-J6695', 'LERP-B4917', 'LERP-D1368',
  'LERP-D3569', 'LERP-P607', 'LERP-N2798', 'LERP-V6434', 'LERP-R7185',
  'LERP-O9894', 'LERP-A4574', 'LERP-D1317', 'LERP-G8809', 'LERP-L8830',
  'LERP-Z7895', 'LERP-Z9940', 'LERP-P8114', 'LERP-V9733', 'LERP-N9289',
  'LERP-W7319', 'LERP-W4477', 'LERP-I2107', 'LERP-B8498', 'LERP-G6242',
  'LERP-U6895', 'LERP-P6212', 'LERP-R7843', 'LERP-S2551', 'LERP-A7132',
  'LERP-V9526', 'LERP-Y2264', 'LERP-Q6922', 'LERP-O5908', 'LERP-R8356',
  'LERP-S1799', 'LERP-S7494', 'LERP-E6188', 'LERP-S8808', 'LERP-U5547',
  'LERP-D1356', 'LERP-R8612', 'LERP-L3225', 'LERP-F6492', 'LERP-Q1841',
  'LERP-H987', 'LERP-N7729', 'LERP-L8552', 'LERP-U8130', 'LERP-O2172',
  'LERP-T5681', 'LERP-Z2679', 'LERP-E2209', 'LERP-S2465', 'LERP-Q5882',
  'LERP-S3426', 'LERP-U4163', 'LERP-S8177', 'LERP-T9256', 'LERP-W6085',
  'LERP-L7034', 'LERP-K3121', 'LERP-L7113', 'LERP-A6899', 'LERP-K4118',
  'LERP-I6010', 'LERP-E5085', 'LERP-I5427', 'LERP-C7795', 'LERP-T3378',
  'LERP-I5347', 'LERP-P7495', 'LERP-U3160', 'LERP-X4909', 'LERP-J7193',
  'LERP-Z8236', 'LERP-V4544', 'LERP-G2865', 'LERP-S7620', 'LERP-M5226',
  'LERP-L9359', 'LERP-Q1262',
];

function normalizeCodigo(codigo: string): string {
  // Normalizações básicas
  codigo = codigo.replace('LERP´-', 'LERP-');
  codigo = codigo.replace('LEPR-', 'LERP-');
  codigo = codigo.replace('LERPC', 'LERP-C');
  
  // Correções específicas (mesmas do update-reagents)
  const corrections: Record<string, string> = {
    'LERP-07863': 'LERP-7863',   // Remover zero inicial
    'LERP-V539': 'LERP-V5390',   // Adicionar zero final
    'LERP-P607': 'LERP-P6070',   // Adicionar zero final
    'LERP-H987': 'LERP-H9870',   // Adicionar zero final
  };
  
  if (corrections[codigo]) {
    return corrections[codigo];
  }
  
  return codigo;
}

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

    const notFound: string[] = [];
    const found: string[] = [];

    for (const codigo of CODES) {
      const normalized = normalizeCodigo(codigo);
      
      // Busca exata
      let entrada = await prisma.reagenteEntrada.findUnique({
        where: { codigoInterno: normalized },
      });

      // Se não encontrou, tentar fuzzy match (mesma lógica do update)
      if (!entrada) {
        const numPart = normalized.replace('LERP-', '').replace(/^[A-Z]+/, '');
        const possibleMatches = await prisma.reagenteEntrada.findMany({
          where: {
            codigoInterno: {
              contains: numPart,
            },
          },
          take: 1,
        });

        if (possibleMatches.length > 0) {
          entrada = possibleMatches[0];
        }
      }

      if (entrada) {
        found.push(normalized);
      } else {
        notFound.push(normalized);
      }
    }

    return NextResponse.json({
      success: true,
      total: CODES.length,
      found: found.length,
      notFound: notFound.length,
      missingCodes: notFound,
    });
  } catch (error: any) {
    console.error('❌ Error:', error);
    return NextResponse.json(
      { success: false, error: error.message },
      { status: 500 }
    );
  }
}
