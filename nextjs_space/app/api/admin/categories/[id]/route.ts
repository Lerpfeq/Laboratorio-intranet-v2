import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function assertAdmin() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) return null;
  const user = await prisma.user.findUnique({ where: { id: session.user.id } });
  return user?.category === "Admin" ? user : null;
}

// PUT — update category
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await assertAdmin();
    if (!admin) return NextResponse.json({ error: "Admin only" }, { status: 403 });

    const { id } = await params;
    const { name, letter, description, storageMap, order } = await request.json();

    const category = await prisma.reagentCategory.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(letter !== undefined && { letter: letter.trim().charAt(0).toUpperCase() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(storageMap !== undefined && { storageMap: storageMap?.trim() || null }),
        ...(order !== undefined && { order }),
      },
    });

    return NextResponse.json(category);
  } catch (error: any) {
    if (error.code === "P2025") return NextResponse.json({ error: "Category not found" }, { status: 404 });
    if (error.code === "P2002") return NextResponse.json({ error: "A category with this name already exists" }, { status: 409 });
    console.error("Error updating category:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE — delete category
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await assertAdmin();
    if (!admin) return NextResponse.json({ error: "Admin only" }, { status: 403 });

    const { id } = await params;
    await prisma.reagentCategory.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.code === "P2025") return NextResponse.json({ error: "Category not found" }, { status: 404 });
    console.error("Error deleting category:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
