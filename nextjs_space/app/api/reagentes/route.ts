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
      orderBy: { nome: 'asc' },
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

    const codigoInterno = `LERP-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`;

    // Check if reagente exists by name
    let reagente = await prisma.reagente.findFirst({
      where: { nome },
    });

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

    const entrada = await prisma.reagenteEntrada.create({
      data: {
        reagenteId: reagente.id,
        usuarioId: session.user.id,
        dataEntrada: new Date(dataEntrada),
        fornecedor,
        notaFiscal,
        volume,
        marca,
        quantidade,
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

    return NextResponse.json(entrada, { status: 201 });
  } catch (error: any) {
    console.error("Reagente POST error:", error);
    return NextResponse.json(
      { error: error?.message || "Erro ao criar entrada de reagente" },
      { status: 500 }
    );
  }
}
