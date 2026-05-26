import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

// Os 10 códigos que não foram encontrados
const MISSING_CODES = [
  'LERP-Y9885',
  'LERP-J2252',
  'LERP-9888',
  'LERP-6204',
  'LERP-2404',
  'LERP-V539',
  'LERP-7390',
  'LERP-07863',
  'LERP-P607',
  'LERP-H987',
];

async function findVariations() {
  console.log('🔍 Buscando variações dos 10 códigos faltantes...\n');

  for (const code of MISSING_CODES) {
    console.log(`\n━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);
    console.log(`🔎 Procurando: ${code}`);
    console.log(`━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━`);

    // Extrair a parte numérica
    const numPart = code.replace('LERP-', '');
    
    // Buscar variações
    const variations = await prisma.reagenteEntrada.findMany({
      where: {
        OR: [
          { codigoInterno: code }, // Exato
          { codigoInterno: { contains: numPart } }, // Contém os números
          { codigoInterno: { endsWith: numPart } }, // Termina com os números
        ],
      },
      select: {
        codigoInterno: true,
        reagente: { select: { nome: true } },
      },
    });

    if (variations.length > 0) {
      console.log(`✅ ENCONTRADO ${variations.length} variação(ões):`);
      variations.forEach((v) => {
        console.log(`   → ${v.codigoInterno} (${v.reagente?.nome || 'N/A'})`);
      });
    } else {
      console.log(`❌ Nenhuma variação encontrada`);
    }
  }

  await prisma.$disconnect();
}

findVariations().catch((e) => {
  console.error('❌ Error:', e);
  prisma.$disconnect();
  process.exit(1);
});
