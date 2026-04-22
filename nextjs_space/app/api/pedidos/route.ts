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

    const pedidos = await prisma.pedido.findMany({
      include: {
        reagente: true,
        usuario: { select: { id: true, name: true, email: true } },
      },
      orderBy: { dataPedido: 'desc' },
    });

    return NextResponse.json(pedidos);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Erro ao buscar pedidos" },
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
    const { reagenteId, quantidade, observacoes } = body;

    const pedido = await prisma.pedido.create({
      data: {
        reagenteId,
        usuarioId: session.user.id,
        quantidade,
        status: "pendente",
        observacoes,
      },
      include: { reagente: true, usuario: true },
    });

    return NextResponse.json(pedido, { status: 201 });
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Erro ao criar pedido" },
      { status: 500 }
    );
  }
}
