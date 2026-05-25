import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

/**
 * POST /api/admin/seed
 * Seeds the database with the original 18 reagent categories and 10 storage locations.
 * Admin-only. Deletes all existing categories/locations before inserting.
 */
export async function POST() {
  try {
    /* ── Auth guard ── */
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
    }

    const user = await prisma.user.findUnique({ where: { id: session.user.id } });
    if (user?.category !== "Admin") {
      return NextResponse.json({ error: "Admin only" }, { status: 403 });
    }

    /* ── Clear existing data ── */
    const deletedCats = await prisma.reagentCategory.deleteMany({});
    const deletedLocs = await prisma.storageLocation.deleteMany({});

    console.log(`🗑️  Cleared ${deletedCats.count} categories, ${deletedLocs.count} locations`);

    /* ── Seed Storage Locations (10) ── */
    const locations = [
      { name: "CFF", description: "Flammable Storage Cabinet", type: "Fume Hood", order: 1 },
      { name: "CAB 1 — SHF 1", description: "Cabinet 1, Shelf 1 — Acids", type: "Cabinet", order: 2 },
      { name: "CAB 1 — SHF 2", description: "Cabinet 1, Shelf 2 — Corrosive", type: "Cabinet", order: 3 },
      { name: "CAB 2 — SHF 1", description: "Cabinet 2, Shelf 1 — Bases", type: "Cabinet", order: 4 },
      { name: "CAB 2 — SHF 2", description: "Cabinet 2, Shelf 2 — Inorganic Salts", type: "Cabinet", order: 5 },
      { name: "CAB 3 — SHF 1", description: "Cabinet 3, Shelf 1 — Polymers/Catalysts/etc.", type: "Cabinet", order: 6 },
      { name: "CAB 3 — SHF 2", description: "Cabinet 3, Shelf 2 — Oxidizers/Monomers/etc.", type: "Cabinet", order: 7 },
      { name: "CAB 4 — SHF 1/2", description: "Cabinet 4 — Controlled Substances", type: "Cabinet", order: 8 },
      { name: "CAB 5 — SHF 1/2", description: "Cabinet 5 — Microbiology", type: "Cabinet", order: 9 },
      { name: "Refrigerator/Freezer", description: "Laboratory Refrigerator / Freezer", type: "Refrigerator", order: 10 },
    ];

    for (const loc of locations) {
      await prisma.storageLocation.create({ data: loc });
    }

    /* ── Seed Reagent Categories (18) ── */
    const categories = [
      { name: "Flammable", description: "Flammable liquids and solids", letter: "U", storageMap: "CFF - Flammable (all categories)", order: 1 },
      { name: "Acid", description: "Acidic compounds", letter: "A", storageMap: "CAB 1 — SHF 1 - Acid", order: 2 },
      { name: "Corrosive", description: "Corrosive materials (non-acid, non-base)", letter: "U", storageMap: "CAB 1 — SHF 2 - Corrosive (non-acid, non-base)", order: 3 },
      { name: "Base", description: "Basic compounds", letter: "B", storageMap: "CAB 2 — SHF 1 - Base", order: 4 },
      { name: "Inorganic Salt", description: "Inorganic salts", letter: "I", storageMap: "CAB 2 — SHF 2 - Inorganic Salt", order: 5 },
      { name: "Polymer", description: "Polymeric materials", letter: "P", storageMap: "CAB 3 — SHF 1 - Polymer/Thiol/Catalyst/Crosslinker/Photoinitiator/Solvent (inert)", order: 6 },
      { name: "Thiol", description: "Thiol compounds", letter: "T", storageMap: "CAB 3 — SHF 1 - Polymer/Thiol/Catalyst/Crosslinker/Photoinitiator/Solvent (inert)", order: 7 },
      { name: "Catalyst", description: "Catalysts", letter: "C", storageMap: "CAB 3 — SHF 1 - Polymer/Thiol/Catalyst/Crosslinker/Photoinitiator/Solvent (inert)", order: 8 },
      { name: "Crosslinker", description: "Crosslinking agents", letter: "X", storageMap: "CAB 3 — SHF 1 - Polymer/Thiol/Catalyst/Crosslinker/Photoinitiator/Solvent (inert)", order: 9 },
      { name: "Photoinitiator", description: "Photoinitiators", letter: "F", storageMap: "CAB 3 — SHF 1 - Polymer/Thiol/Catalyst/Crosslinker/Photoinitiator/Solvent (inert)", order: 10 },
      { name: "Solvent (inert)", description: "Organic and inorganic solvents (inert)", letter: "S", storageMap: "CAB 3 — SHF 1 - Polymer/Thiol/Catalyst/Crosslinker/Photoinitiator/Solvent (inert)", order: 11 },
      { name: "Oxidizer / Reducer", description: "Oxidizing and reducing agents", letter: "O", storageMap: "CAB 3 — SHF 2 - Oxidizer/Nanomaterial/Analytical/Monomer", order: 12 },
      { name: "Nanomaterial", description: "Nanomaterials", letter: "N", storageMap: "CAB 3 — SHF 2 - Oxidizer/Nanomaterial/Analytical/Monomer", order: 13 },
      { name: "Analytical", description: "Analytical reagents", letter: "L", storageMap: "CAB 3 — SHF 2 - Oxidizer/Nanomaterial/Analytical/Monomer", order: 14 },
      { name: "Monomer", description: "Polymerization monomers", letter: "M", storageMap: "CAB 3 — SHF 2 - Oxidizer/Nanomaterial/Analytical/Monomer", order: 15 },
      { name: "Controlled", description: "Controlled substances", letter: "K", storageMap: "CAB 4 — SHF 1/2 - Controlled", order: 16 },
      { name: "Microbiology", description: "Microbiology reagents", letter: "G", storageMap: "CAB 5 — SHF 1/2 - Microbiology", order: 17 },
      { name: "Refrigerated", description: "Refrigerated reagents", letter: "U", storageMap: "Refrigerator/Freezer - Refrigerated", order: 18 },
    ];

    for (const cat of categories) {
      await prisma.reagentCategory.create({ data: cat });
    }

    /* ── Verify ── */
    const totalLocations = await prisma.storageLocation.count();
    const totalCategories = await prisma.reagentCategory.count();

    console.log(`🌱 Seed done: ${totalCategories} categories, ${totalLocations} locations`);

    return NextResponse.json({
      success: true,
      message: `Seed completed! Created ${totalCategories} categories and ${totalLocations} locations.`,
      data: { categories: totalCategories, locations: totalLocations },
    });
  } catch (error: any) {
    console.error("❌ Error seeding database:", error);
    return NextResponse.json(
      { success: false, error: "Failed to seed database", details: error.message },
      { status: 500 }
    );
  }
}
