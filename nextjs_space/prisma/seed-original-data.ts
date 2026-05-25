import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedOriginalData() {
  console.log('🌱 Starting seed: Original Categories and Storage Locations\n');

  // ========================================
  // STEP 0: Clear existing data
  // ========================================
  console.log('🗑️  Clearing existing data...\n');

  const deletedCats = await prisma.reagentCategory.deleteMany();
  console.log(`   Deleted ${deletedCats.count} existing categories`);

  const deletedLocs = await prisma.storageLocation.deleteMany();
  console.log(`   Deleted ${deletedLocs.count} existing locations`);

  console.log('');

  // ========================================
  // STEP 1: Seed Storage Locations (8 locations)
  // ========================================
  console.log('📍 Seeding Storage Locations...\n');

  const locations = [
    {
      name: 'CAB 1',
      description: 'Cabinet 1 - Solvents',
      type: 'Cabinet',
      order: 1,
    },
    {
      name: 'CAB 2',
      description: 'Cabinet 2 - Acids and Bases',
      type: 'Cabinet',
      order: 2,
    },
    {
      name: 'CAB 3',
      description: 'Cabinet 3 - Salts',
      type: 'Cabinet',
      order: 3,
    },
    {
      name: 'CAB 4',
      description: 'Cabinet 4 - Indicators',
      type: 'Cabinet',
      order: 4,
    },
    {
      name: 'CAB 5',
      description: 'Cabinet 5 - Catalysts',
      type: 'Cabinet',
      order: 5,
    },
    {
      name: 'CFF',
      description: 'Chemical Fume Hood',
      type: 'Fume Hood',
      order: 6,
    },
    {
      name: 'Refrigerator',
      description: 'Laboratory Refrigerator',
      type: 'Refrigerator',
      order: 7,
    },
    {
      name: 'Freezer',
      description: 'Laboratory Freezer',
      type: 'Freezer',
      order: 8,
    },
  ];

  for (const location of locations) {
    await prisma.storageLocation.create({ data: location });
    console.log(`   ✅ Created location: ${location.name} — ${location.description}`);
  }

  console.log('\n✅ Storage Locations seeded!\n');

  // ========================================
  // STEP 2: Seed Reagent Categories (8 categories)
  // ========================================
  console.log('📦 Seeding Reagent Categories...\n');

  const categories = [
    {
      name: 'Solvents',
      description: 'Organic and inorganic solvents',
      letter: 'S',
      storageMap: 'CAB 1',
      order: 1,
    },
    {
      name: 'Acids',
      description: 'Acidic compounds',
      letter: 'A',
      storageMap: 'CAB 2',
      order: 2,
    },
    {
      name: 'Bases',
      description: 'Basic compounds',
      letter: 'B',
      storageMap: 'CAB 2',
      order: 3,
    },
    {
      name: 'Salts',
      description: 'Inorganic salts',
      letter: 'L',
      storageMap: 'CAB 3',
      order: 4,
    },
    {
      name: 'Indicators',
      description: 'pH and chemical indicators',
      letter: 'I',
      storageMap: 'CAB 4',
      order: 5,
    },
    {
      name: 'Catalysts',
      description: 'Catalysts and initiators',
      letter: 'C',
      storageMap: 'CAB 5',
      order: 6,
    },
    {
      name: 'Monomers',
      description: 'Polymerization monomers',
      letter: 'M',
      storageMap: 'Refrigerator',
      order: 7,
    },
    {
      name: 'Others',
      description: 'Other reagents',
      letter: 'O',
      storageMap: 'CFF',
      order: 8,
    },
  ];

  for (const category of categories) {
    await prisma.reagentCategory.create({ data: category });
    console.log(`   ✅ Created category: ${category.name} (${category.letter}) → ${category.storageMap}`);
  }

  console.log('\n✅ Reagent Categories seeded!\n');

  // ========================================
  // SUMMARY
  // ========================================
  const totalLocations = await prisma.storageLocation.count();
  const totalCategories = await prisma.reagentCategory.count();

  console.log('📊 SEED SUMMARY:\n');
  console.log(`   📍 Total Storage Locations: ${totalLocations}`);
  console.log(`   📦 Total Reagent Categories: ${totalCategories}\n`);

  console.log('🎉 Seed completed successfully!\n');
}

seedOriginalData()
  .catch((e) => {
    console.error('\n❌ Error seeding data:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
