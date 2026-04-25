import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
export const dynamic = "force-dynamic";

// Maps English category names to their single-letter code
const CATEGORY_LETTER: Record<string, string> = {
  "Solvent":              "S",
  "Acid":                 "A",
  "Base":                 "B",
  "Monomer":              "M",
  "Polymer":              "P",
  "Crosslinker":          "X",
  "Catalyst":             "C",
  "Photoinitiator":       "F",
  "Oxidizer / Reducer":   "O",
  "Nanomaterial":         "N",
  "Analytical":           "L",
  "Controlled Substance": "K",
  "Microbiology":         "G",
  "Inorganic Salt":       "I",
  "Thiol":                "T",
};

function generateCodigoInterno(categoria: string): string {
  const letter = CATEGORY_LETTER[categoria] ?? "U"; // U = Unknown
  const digits = Math.floor(1000 + Math.random() * 9000).toString(); // 4 random digits
  return `LERP-${letter}${digits}`;
}

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }
    const reagentes = await prisma.reagente.findMany({
      select: {
        id: true,
        nome: true,
        marca: true,
        volume: true,
        localidade: true,
        status: true,
        ultimaAtualizacao: true,
        entradas: {
          select: {
            codigoInterno: true,
            dataValidade: true,
            localizacao: true,
          },
          orderBy: { dataEntrada: "desc" },
          take: 1,
        },
      },
      orderBy: { nome: "asc" },
    });
    return NextResponse.json(reagentes);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Erro ao buscar reagentes" },
      { status: 500 }
    );
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (user?.category === "IC") {
      return NextResponse.json({ error: "Permissao negada" }, { status: 403 });
    }

    const body = await request.json();
    const {
      nome,
      marca,
      volume,
      localidade,
      fornecedor,
      notaFiscal,
      quantidade,
      dataEntrada,
      observacoes,
      categoria,
      concentracao,
      dataValidade,
      perigos,
      responsavel,
    } = body;

    // Upsert the reagente
    let reagente = await prisma.reagente.findFirst({ where: { nome } });
    if (!reagente) {
      reagente = await prisma.reagente.create({
        data: { nome, marca, volume, localidade, status: "ok" },
      });
    } else {
      reagente = await prisma.reagente.update({
        where: { id: reagente.id },
        data: { status: "ok", ultimaAtualizacao: new Date() },
      });
    }

    // Create one entrada per bottle (quantidade), each with its own unique code
    const qty = Math.max(1, parseInt(quantidade) || 1);
    const entradas = [];

    for (let i = 0; i < qty; i++) {
      // Keep regenerating until the code is unique in the DB
      let codigoInterno: string;
      let exists = true;
      do {
        codigoInterno = generateCodigoInterno(categoria);
        const found = await prisma.reagenteEntrada.findFirst({
          where: { codigoInterno },
        });
        exists = !!found;
      } while (exists);

      const entrada = await prisma.reagenteEntrada.create({
        data: {
          reagenteId: reagente.id,
          usuarioId: session.user.id,
          dataEntrada: new Date(dataEntrada),
          fornecedor,
          notaFiscal,
          volume,
          marca,
          quantidade: 1, // each entry represents a single bottle
          codigoInterno,
          localizacao: localidade,
          observacoes,
          categoria,
          concentracao,
          dataValidade: dataValidade ? new Date(dataValidade) : null,
          perigos,
          responsavel: responsavel || user?.name || "Não informado",
        },
        include: { reagente: true },
      });

      entradas.push(entrada);
    }

    // Return array (even for qty=1, always an array so the frontend handles it uniformly)
    return NextResponse.json(entradas, { status: 201 });
  } catch (error: any) {
    console.error("Reagente POST error:", error);
    return NextResponse.json(
      { error: error?.message || "Erro ao criar entrada de reagente" },
      { status: 500 }
    );
  }
}
