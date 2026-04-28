import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const nome = searchParams.get("nome") || "";
    const marca = searchParams.get("marca") || "";
    const status = searchParams.get("status") || "";

    const where: any = {};

    // Filtro por nome
    if (nome) {
      where.nome = {
        contains: nome,
        mode: "insensitive",
      };
    }

    // Filtro por marca
    if (marca) {
      where.marca = {
        contains: marca,
        mode: "insensitive",
      };
    }

    // Filtro por status
    if (status) {
      where.status = status;
    }

    const reagentes = await prisma.reagente.findMany({
      where,
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
            id: true,
            codigoInterno: true,
            dataEntrada: true,
            dataValidade: true,
            categoria: true,
            concentracao: true,
            localizacao: true,
            quantidade: true,
            responsavel: true,
          },
          orderBy: { dataEntrada: "desc" },
          take: 1,
        },
      },
      orderBy: { nome: "asc" },
    });

    return NextResponse.json(reagentes);
  } catch (error: any) {
    console.error("Consulta error:", error);
    return NextResponse.json(
      { error: error?.message || "Erro ao buscar reagentes" },
      { status: 500 }
    );
  }
}
