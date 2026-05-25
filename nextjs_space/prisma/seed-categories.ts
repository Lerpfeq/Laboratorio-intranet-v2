import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding categories and storage locations...');

  // Categories — merging storageMap + CATEGORY_LETTER into one source of truth
  const categories = [
    { name: 'Flammable',          letter: 'U', storageMap: 'CFF - Flammable (all categories)',                                               order: 1 },
    { name: 'Acid',               letter: 'A', storageMap: 'CAB 1 — SHF 1 - Acid',                                                          order: 2 },
    { name: 'Corrosive',          letter: 'U', storageMap: 'CAB 1 — SHF 2 - Corrosive (non-acid, non-base)',                                 order: 3 },
    { name: 'Base',               letter: 'B', storageMap: 'CAB 2 — SHF 1 - Base',                                                          order: 4 },
    { name: 'Inorganic Salt',     letter: 'I', storageMap: 'CAB 2 — SHF 2 - Inorganic Salt',                                                order: 5 },
    { name: 'Polymer',            letter: 'P', storageMap: 'CAB 3 — SHF 1 - Polymer/Thiol/Catalyst/Crosslinker/Photoinitiator/Solvent (inert)', order: 6 },
    { name: 'Thiol',              letter: 'T', storageMap: 'CAB 3 — SHF 1 - Polymer/Thiol/Catalyst/Crosslinker/Photoinitiator/Solvent (inert)', order: 7 },
    { name: 'Catalyst',           letter: 'C', storageMap: 'CAB 3 — SHF 1 - Polymer/Thiol/Catalyst/Crosslinker/Photoinitiator/Solvent (inert)', order: 8 },
    { name: 'Crosslinker',        letter: 'X', storageMap: 'CAB 3 — SHF 1 - Polymer/Thiol/Catalyst/Crosslinker/Photoinitiator/Solvent (inert)', order: 9 },
    { name: 'Photoinitiator',     letter: 'F', storageMap: 'CAB 3 — SHF 1 - Polymer/Thiol/Catalyst/Crosslinker/Photoinitiator/Solvent (inert)', order: 10 },
    { name: 'Solvent (inert)',    letter: 'S', storageMap: 'CAB 3 — SHF 1 - Polymer/Thiol/Catalyst/Crosslinker/Photoinitiator/Solvent (inert)', order: 11 },
    { name: 'Oxidizer / Reducer', letter: 'O', storageMap: 'CAB 3 — SHF 2 - Oxidizer/Nanomaterial/Analytical/Monomer',                      order: 12 },
    { name: 'Nanomaterial',       letter: 'N', storageMap: 'CAB 3 — SHF 2 - Oxidizer/Nanomaterial/Analytical/Monomer',                      order: 13 },
    { name: 'Analytical',         letter: 'L', storageMap: 'CAB 3 — SHF 2 - Oxidizer/Nanomaterial/Analytical/Monomer',                      order: 14 },
    { name: 'Monomer',            letter: 'M', storageMap: 'CAB 3 — SHF 2 - Oxidizer/Nanomaterial/Analytical/Monomer',                      order: 15 },
    { name: 'Controlled',         letter: 'K', storageMap: 'CAB 4 — SHF 1/2 - Controlled',                                                  order: 16 },
    { name: 'Microbiology',       letter: 'G', storageMap: 'CAB 5 — SHF 1/2 - Microbiology',                                                order: 17 },
    { name: 'Refrigerated',       letter: 'U', storageMap: 'Refrigerator/Freezer - Refrigerated',                                            order: 18 },
  ];

  for (const cat of categories) {
    await prisma.reagentCategory.upsert({
      where: { name: cat.name },
      update: { letter: cat.letter, storageMap: cat.storageMap, order: cat.order },
      create: cat,
    });
  }
  console.log(`✅ ${categories.length} categories seeded`);

  // Storage locations
  const locations = [
    { name: 'CFF',                       description: 'Flammable Storage Cabinet', type: 'Cabinet',       order: 1 },
    { name: 'CAB 1 — SHF 1',            description: 'Cabinet 1, Shelf 1 — Acids', type: 'Cabinet',      order: 2 },
    { name: 'CAB 1 — SHF 2',            description: 'Cabinet 1, Shelf 2 — Corrosive', type: 'Cabinet',  order: 3 },
    { name: 'CAB 2 — SHF 1',            description: 'Cabinet 2, Shelf 1 — Bases', type: 'Cabinet',      order: 4 },
    { name: 'CAB 2 — SHF 2',            description: 'Cabinet 2, Shelf 2 — Inorganic Salts', type: 'Cabinet', order: 5 },
    { name: 'CAB 3 — SHF 1',            description: 'Cabinet 3, Shelf 1 — Polymers/Catalysts/etc.', type: 'Cabinet', order: 6 },
    { name: 'CAB 3 — SHF 2',            description: 'Cabinet 3, Shelf 2 — Oxidizers/Monomers/etc.', type: 'Cabinet', order: 7 },
    { name: 'CAB 4 — SHF 1/2',          description: 'Cabinet 4 — Controlled Substances', type: 'Cabinet', order: 8 },
    { name: 'CAB 5 — SHF 1/2',          description: 'Cabinet 5 — Microbiology', type: 'Cabinet',        order: 9 },
    { name: 'Refrigerator/Freezer',      description: 'Laboratory Refrigerator / Freezer', type: 'Refrigerator', order: 10 },
  ];

  for (const loc of locations) {
    await prisma.storageLocation.upsert({
      where: { name: loc.name },
      update: { description: loc.description, type: loc.type, order: loc.order },
      create: loc,
    });
  }
  console.log(`✅ ${locations.length} storage locations seeded`);
  console.log('🎉 Done!');
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
