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

// PUT — update storage location
export async function PUT(request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await assertAdmin();
    if (!admin) return NextResponse.json({ error: "Admin only" }, { status: 403 });

    const { id } = await params;
    const { name, description, type, order } = await request.json();

    const location = await prisma.storageLocation.update({
      where: { id },
      data: {
        ...(name && { name: name.trim() }),
        ...(description !== undefined && { description: description?.trim() || null }),
        ...(type !== undefined && { type: type?.trim() || null }),
        ...(order !== undefined && { order }),
      },
    });

    return NextResponse.json(location);
  } catch (error: any) {
    if (error.code === "P2025") return NextResponse.json({ error: "Location not found" }, { status: 404 });
    if (error.code === "P2002") return NextResponse.json({ error: "A location with this name already exists" }, { status: 409 });
    console.error("Error updating location:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// DELETE — delete storage location
export async function DELETE(_request: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await assertAdmin();
    if (!admin) return NextResponse.json({ error: "Admin only" }, { status: 403 });

    const { id } = await params;
    await prisma.storageLocation.delete({ where: { id } });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    if (error.code === "P2025") return NextResponse.json({ error: "Location not found" }, { status: 404 });
    console.error("Error deleting location:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
