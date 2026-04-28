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

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (user?.category !== "Admin") {
      return NextResponse.json({ error: "Permissao negada" }, { status: 403 });
    }

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        category: true,
        createdAt: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(users);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Erro ao buscar usuarios" },
      { status: 500 }
    );
  }
}

export async function PATCH(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }

    const admin = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (admin?.category !== "Admin") {
      return NextResponse.json({ error: "Permissao negada" }, { status: 403 });
    }

    const body = await request.json();
    const { userId, status, category } = body;

    if (!userId) {
      return NextResponse.json({ error: "userId é obrigatório" }, { status: 400 });
    }

    if (!status && !category) {
      return NextResponse.json(
        { error: "Informe ao menos status ou categoria para atualização" },
        { status: 400 }
      );
    }

    const validStatuses = ["pending", "approved"];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json({ error: "Status inválido" }, { status: 400 });
    }

    const validCategories = ["IC", "Pos-graduando", "Admin"];
    if (category && !validCategories.includes(category)) {
      return NextResponse.json({ error: "Categoria inválida" }, { status: 400 });
    }

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        status: status || undefined,
        category: category || undefined,
      },
      select: {
        id: true,
        name: true,
        email: true,
        status: true,
        category: true,
      },
    });

    return NextResponse.json(updatedUser);
  } catch (error: any) {
    return NextResponse.json(
      { error: error?.message || "Erro ao atualizar usuario" },
      { status: 500 }
    );
  }
}
