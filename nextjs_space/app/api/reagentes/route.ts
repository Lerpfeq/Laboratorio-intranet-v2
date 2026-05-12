import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { gerarEtiquetaReagente } from "@/lib/reagentes-label";

export const dynamic = "force-dynamic";

const CATEGORY_LETTER: Record<string, string> = {
  Solvent: "S",
  Acid: "A",
  Base: "B",
  Monomer: "M",
  Polymer: "P",
  Crosslinker: "X",
  Catalyst: "C",
  Photoinitiator: "F",
  "Oxidizer / Reducer": "O",
  Nanomaterial: "N",
  Analytical: "L",
  "Controlled Substance": "K",
  Microbiology: "G",
  "Inorganic Salt": "I",
  Thiol: "T",
};

function generateCodigoInterno(categoria: string): string {
  const letter = CATEGORY_LETTER[categoria] ?? "U";
  const digits = Math.floor(1000 + Math.random() * 9000).toString();
  return `LERP-${letter}${digits}`;
}

export async function GET(_request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const reagentes = await prisma.reagente.findMany({
      select: {
        id: true,
        nome: true,
        marca: true,
        localidade: true,
        status: true,
        ultimaAtualizacao: true,
        entradas: {
          select: {
            id: true,
            codigoInterno: true,
            dataValidade: true,
            localizacao: true,
            dataEntrada: true,
            quantidade: true,
            quantidadeAtual: true,
            unidade: true,
          },
          orderBy: { dataEntrada: "desc" },
        },
      },
      orderBy: { nome: "asc" },
    });

    return NextResponse.json(reagentes);
  } catch (error: any) {
    return NextResponse.json({ error: error?.message || "Error fetching reagents" }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (user?.category === "IC") {
      return NextResponse.json({ error: "Permission denied" }, { status: 403 });
    }

    const data = await request.json();

    const nome = String(data.nome ?? "").trim();
    const fabricante = String(data.fabricante ?? data.marca ?? data.fornecedor ?? "").trim();
    const categoria = String(data.categoria ?? "").trim();
    const localizacao = String(data.localizacao ?? data.localidade ?? "").trim();
    const concentracao = String(data.concentracao ?? "").trim();
    const numeroNotaFiscal = String(data.numeroNotaFiscal ?? data.notaFiscal ?? data.lote ?? "").trim();
    const validadeIndeterminada = Boolean(data.validadeIndeterminada);
    const perigos = String(data.perigos ?? "").trim();
    const quantidadeInformada = Number.parseFloat(String(data.quantidade ?? 0));
    const quantidade = Number.isFinite(quantidadeInformada) && quantidadeInformada > 0 ? quantidadeInformada : 0;
    const unidade = String(data.unidade ?? "L").trim() || "L";
    const quantidadeFrascosRaw = Number.parseInt(String(data.quantidadeFrascos ?? data.numeroFrascos ?? 1), 10);
    const quantidadeFrascos = Number.isFinite(quantidadeFrascosRaw) && quantidadeFrascosRaw > 0 ? quantidadeFrascosRaw : 1;

    if (!nome || !fabricante || !numeroNotaFiscal || quantidade <= 0) {
      return NextResponse.json({ error: "Name, supplier, invoice number and quantity are required" }, { status: 400 });
    }

    const dataEntrada = data.dataEntrada ? new Date(data.dataEntrada) : new Date();
    const dataValidade = validadeIndeterminada ? null : (data.dataValidade ? new Date(data.dataValidade) : null);

    const entradas = await prisma.$transaction(async (tx) => {
      let reagente = await tx.reagente.findFirst({ where: { nome, marca: fabricante } });

      if (!reagente) {
        reagente = await tx.reagente.create({
          data: {
            nome,
            marca: fabricante,
            localidade: localizacao || null,
            status: "ok",
          },
        });
      } else {
        reagente = await tx.reagente.update({
          where: { id: reagente.id },
          data: { status: "ok", ultimaAtualizacao: new Date(), localidade: localizacao || reagente.localidade },
        });
      }

      const createdEntradas = [];

      for (let i = 0; i < quantidadeFrascos; i++) {
        let codigoInterno: string;
        let exists = true;

        do {
          codigoInterno = generateCodigoInterno(categoria);
          const found = await tx.reagenteEntrada.findFirst({ where: { codigoInterno } });
          exists = !!found;
        } while (exists);

        const entrada = await tx.reagenteEntrada.create({
          data: {
            reagenteId: reagente.id,
            usuarioId: session.user.id,
            dataEntrada,
            fornecedor: fabricante,
            notaFiscal: numeroNotaFiscal || null,
            quantidade,
            quantidadeAtual: quantidade,
            unidade,
            marca: fabricante,
            codigoInterno,
            localizacao: localizacao || null,
            observacoes: null,
            categoria: categoria || null,
            concentracao: concentracao || null,
            dataValidade,
            validadeIndeterminada,
            perigos: perigos || null,
            responsavel: String(data.responsavel ?? user?.name ?? "Not informed"),
          },
          include: { reagente: true },
        });

        const etiquetaPdf = await gerarEtiquetaReagente({
          nome: entrada.reagente.nome,
          codigoInterno: entrada.codigoInterno,
          categoria: entrada.categoria,
          concentracao: entrada.concentracao,
          localizacao: entrada.localizacao,
          dataValidade: entrada.dataValidade,
          dataEntrada: entrada.dataEntrada,
          fornecedor: entrada.fornecedor,
          notaFiscal: entrada.notaFiscal,
          responsavel: entrada.responsavel,
          perigos: entrada.perigos,
        });

        createdEntradas.push({
          ...entrada,
          etiquetaPdfBase64: etiquetaPdf.toString("base64"),
          etiquetaFileName: `etiqueta-${entrada.codigoInterno}.pdf`,
        });
      }

      return createdEntradas;
    });

    return NextResponse.json(entradas, { status: 201 });
  } catch (error: any) {
    console.error("Reagente POST error:", error);
    return NextResponse.json({ error: error?.message || "Error creating reagent entry" }, { status: 500 });
  }
}
