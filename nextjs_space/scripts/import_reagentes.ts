import { PrismaClient } from '@prisma/client';
import * as fs from 'fs';

const prisma = new PrismaClient();

function generateCode(): string {
  const letter = String.fromCharCode(65 + Math.floor(Math.random() * 26));
  const num = Math.floor(1000 + Math.random() * 9000);
  return `LERP-${letter}${num}`;
}

async function main() {
  const data = JSON.parse(fs.readFileSync('/tmp/reagentes_to_insert.json', 'utf-8'));
  
  // Use the first user as the import user
  const user = await prisma.user.findFirst({ orderBy: { createdAt: 'asc' } });
  if (!user) {
    console.error('❌ No user found in the database');
    process.exit(1);
  }
  console.log(`Using user: ${user.name} (${user.id})\n`);

  // Cache existing Reagente records by name
  const existingReagentes = await prisma.reagente.findMany();
  const reagenteMap = new Map<string, string>();
  for (const r of existingReagentes) {
    reagenteMap.set(r.nome.toLowerCase(), r.id);
  }

  // Track used codes to avoid collisions
  const existingCodes = new Set(
    (await prisma.reagenteEntrada.findMany({ select: { codigoInterno: true } }))
      .map(e => e.codigoInterno)
  );

  let successCount = 0;
  let errorCount = 0;
  const errors: string[] = [];

  for (let i = 0; i < data.length; i++) {
    const r = data[i];
    try {
      // Find or create Reagente
      let reagenteId = reagenteMap.get(r.nome.toLowerCase());
      if (!reagenteId) {
        const newReagente = await prisma.reagente.create({
          data: {
            nome: r.nome,
            marca: r.marca || null,
            volume: `${r.volume} ${r.unidade}`,
            localidade: r.localizacao || null,
            status: 'ok',
          }
        });
        reagenteId = newReagente.id;
        reagenteMap.set(r.nome.toLowerCase(), reagenteId);
      }

      // Generate unique code
      let code: string;
      do {
        code = generateCode();
      } while (existingCodes.has(code));
      existingCodes.add(code);

      // Create ReagenteEntrada for each unit in Quantity
      const qty = Math.max(r.quantidade, 1);
      for (let q = 0; q < qty; q++) {
        let entryCode = code;
        if (q > 0) {
          // Generate new code for additional units
          do {
            entryCode = generateCode();
          } while (existingCodes.has(entryCode));
          existingCodes.add(entryCode);
        }

        await prisma.reagenteEntrada.create({
          data: {
            reagenteId,
            usuarioId: user.id,
            dataEntrada: new Date(r.dataEntrada),
            fornecedor: r.fornecedor,
            notaFiscal: r.notaFiscal || null,
            quantidade: r.volume,
            quantidadeAtual: r.volume,
            unidade: r.unidade,
            marca: r.marca || null,
            codigoInterno: entryCode,
            localizacao: r.localizacao || null,
            categoria: r.categoria,
            concentracao: r.concentracao || null,
            dataValidade: r.dataValidade ? new Date(r.dataValidade) : null,
            validadeIndeterminada: r.validadeIndeterminada,
            responsavel: user.name || 'System Import',
          }
        });
      }

      successCount++;
      if ((i + 1) % 20 === 0) {
        console.log(`  ... ${i + 1}/${data.length} processados`);
      }
    } catch (error: any) {
      errorCount++;
      errors.push(`${i + 1}. ${r.nome}: ${error.message}`);
    }
  }

  console.log(`\n=== RESUMO DA IMPORTAÇÃO ===`);
  console.log(`✅ Sucessos: ${successCount}`);
  console.log(`❌ Erros: ${errorCount}`);
  console.log(`📊 Total processado: ${data.length}`);

  if (errors.length > 0) {
    console.log(`\n=== ERROS ===`);
    errors.forEach(e => console.log(e));
  }

  // Final count
  const totalReagentes = await prisma.reagente.count();
  const totalEntradas = await prisma.reagenteEntrada.count();
  console.log(`\n=== ESTADO DO BANCO ===`);
  console.log(`Total Reagente: ${totalReagentes}`);
  console.log(`Total ReagenteEntrada: ${totalEntradas}`);
}

main()
  .catch(e => { console.error('Fatal:', e); process.exit(1); })
  .finally(() => prisma.$disconnect());
