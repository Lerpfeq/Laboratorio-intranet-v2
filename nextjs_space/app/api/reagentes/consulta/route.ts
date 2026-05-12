import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const nome = searchParams.get("nome") || "";
    const marca = searchParams.get("marca") || "";

    const where: any = {};

    if (nome) {
      where.nome = { contains: nome, mode: "insensitive" };
    }

    if (marca) {
      where.marca = { contains: marca, mode: "insensitive" };
    }

    const reagentesBase = await prisma.reagente.findMany({
      where,
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
            dataEntrada: true,
            dataValidade: true,
            categoria: true,
            concentracao: true,
            localizacao: true,
            quantidade: true,
            quantidadeAtual: true,
            unidade: true,
            responsavel: true,
          },
          orderBy: { dataEntrada: "desc" },
        },
      },
      orderBy: { nome: "asc" },
    });

    const reagentes = reagentesBase.flatMap((reagente) => {
      if (reagente.entradas.length === 0) {
        return [];
      }

      return reagente.entradas.map((entrada) => ({
        id: entrada.id,
        reagenteId: reagente.id,
        nome: reagente.nome,
        marca: reagente.marca,
        localidade: reagente.localidade,
        status: reagente.status,
        ultimaAtualizacao: reagente.ultimaAtualizacao,
        entradas: [entrada],
      }));
    });

    return NextResponse.json(reagentes);
  } catch (error: any) {
    console.error("Consulta error:", error);
    return NextResponse.json({ error: error?.message || "Error fetching reagents" }, { status: 500 });
  }
}
