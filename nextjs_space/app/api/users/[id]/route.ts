import { getServerSession } from "next-auth";
import { NextRequest, NextResponse } from "next/server";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type RouteContext = {
  params: {
    id: string;
  };
};

export async function DELETE(_request: NextRequest, context: RouteContext) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json({ error: "Nao autenticado" }, { status: 401 });
    }

    const admin = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { id: true, category: true },
    });

    if (!admin || admin.category !== "Admin") {
      return NextResponse.json({ error: "Permissao negada" }, { status: 403 });
    }

    const userId = context.params.id;

    if (!userId) {
      return NextResponse.json({ error: "ID do usuario e obrigatorio" }, { status: 400 });
    }

    if (userId === session.user.id) {
      return NextResponse.json(
        { error: "Voce nao pode excluir seu proprio usuario" },
        { status: 400 }
      );
    }

    const userToDelete = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, name: true, email: true },
    });

    if (!userToDelete) {
      return NextResponse.json({ error: "Usuario nao encontrado" }, { status: 404 });
    }

    await prisma.user.delete({
      where: { id: userId },
    });

    return NextResponse.json({
      message: "Usuario excluido com sucesso",
      deletedUser: userToDelete,
    });
  } catch (error: any) {
    if (error?.code === "P2003") {
      return NextResponse.json(
        {
          error:
            "Nao foi possivel excluir este usuario porque ele possui registros relacionados no sistema",
        },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: error?.message || "Erro ao excluir usuario" },
      { status: 500 }
    );
  }
}
