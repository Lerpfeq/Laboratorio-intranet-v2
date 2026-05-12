import { NextRequest, NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import * as fs from 'fs';
import * as path from 'path';

function generateCode(): string {
  const letter = String.fromCharCode(65 + Math.floor(Math.random() * 26));
  const num = Math.floor(1000 + Math.random() * 9000);
  return `LERP-${letter}${num}`;
}

export async function POST(request: NextRequest) {
  try {
    // Auth: require logged-in user (session-based)
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      // Fallback: accept a secret key for headless execution
      const body = await request.json().catch(() => ({}));
      const secret = body?.secret || request.headers.get('x-seed-secret');
      if (secret !== process.env.SEED_SECRET && secret !== 'lerp-seed-2026') {
        return NextResponse.json({ error: 'Unauthorized - Login or provide seed secret' }, { status: 401 });
      }
    }

    // Find the first user to use as import owner
    const user = await prisma.user.findFirst({ orderBy: { createdAt: 'asc' } });
    if (!user) {
      return NextResponse.json({ error: 'No user found in the database. Create a user first.' }, { status: 400 });
    }

    // Read seed data from the bundled JSON file
    const seedFilePath = path.join(process.cwd(), 'public', 'data', 'reagentes_seed.json');
    if (!fs.existsSync(seedFilePath)) {
      return NextResponse.json({ error: `Seed file not found at ${seedFilePath}` }, { status: 404 });
    }
    const seedData = JSON.parse(fs.readFileSync(seedFilePath, 'utf-8'));

    console.log(`[SEED] Starting import of ${seedData.length} reagents with user ${user.name} (${user.id})...`);

    // Cache existing Reagente records by name
    const existingReagentes = await prisma.reagente.findMany();
    const reagenteMap = new Map<string, string>();
    for (const r of existingReagentes) {
      reagenteMap.set(r.nome.toLowerCase(), r.id);
    }

    // Track used codes to avoid collisions
    const existingCodes = new Set(
      (await prisma.reagenteEntrada.findMany({ select: { codigoInterno: true } }))
        .map((e: { codigoInterno: string }) => e.codigoInterno)
    );

    let sucessos = 0;
    let erros = 0;
    const errosDetalhados: { reagente: string; erro: string }[] = [];

    for (let i = 0; i < seedData.length; i++) {
      const r = seedData[i];
      try {
        // Find or create Reagente master record
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

        // Generate unique internal code
        let code: string;
        do {
          code = generateCode();
        } while (existingCodes.has(code));
        existingCodes.add(code);

        // Create entries for each unit in quantity
        const qty = Math.max(r.quantidade, 1);
        for (let q = 0; q < qty; q++) {
          let entryCode = code;
          if (q > 0) {
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

        sucessos++;
      } catch (error: any) {
        erros++;
        errosDetalhados.push({
          reagente: r.nome || `Item ${i}`,
          erro: error.message
        });
        console.error(`[SEED] Error importing ${r.nome}:`, error.message);
      }
    }

    // Final counts
    const totalReagentes = await prisma.reagente.count();
    const totalEntradas = await prisma.reagenteEntrada.count();

    console.log(`[SEED] Done - Success: ${sucessos}, Errors: ${erros}`);
    console.log(`[SEED] DB state - Reagente: ${totalReagentes}, ReagenteEntrada: ${totalEntradas}`);

    return NextResponse.json({
      success: true,
      message: `Importação concluída: ${sucessos} sucessos, ${erros} erros`,
      sucessos,
      erros,
      totalReagentes,
      totalEntradas,
      errosDetalhados: erros > 0 ? errosDetalhados : undefined
    });

  } catch (error: any) {
    console.error('[SEED] Fatal error:', error);
    return NextResponse.json({
      error: 'Erro ao importar reagentes',
      details: error.message
    }, { status: 500 });
  }
}

// GET to check status
export async function GET() {
  try {
    const totalReagentes = await prisma.reagente.count();
    const totalEntradas = await prisma.reagenteEntrada.count();

    return NextResponse.json({
      totalReagentes,
      totalEntradas,
      seedFileExists: fs.existsSync(path.join(process.cwd(), 'public', 'data', 'reagentes_seed.json'))
    });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
