import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

// GET — list all storage locations (any authenticated user)
export async function GET() {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const locations = await prisma.storageLocation.findMany({
      orderBy: { order: "asc" },
    });

    return NextResponse.json(locations);
  } catch (error: any) {
    console.error("Error fetching locations:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// POST — create storage location (Admin only)
export async function POST(request: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (user?.category !== "Admin") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    const { name, description, type, order } = await request.json();

    if (!name?.trim()) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }

    const maxOrder = await prisma.storageLocation.aggregate({ _max: { order: true } });

    const location = await prisma.storageLocation.create({
      data: {
        name: name.trim(),
        description: description?.trim() || null,
        type: type?.trim() || null,
        order: order ?? (maxOrder._max.order ?? 0) + 1,
      },
    });

    return NextResponse.json(location, { status: 201 });
  } catch (error: any) {
    if (error.code === "P2002") {
      return NextResponse.json({ error: "A location with this name already exists" }, { status: 409 });
    }
    console.error("Error creating location:", error);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
