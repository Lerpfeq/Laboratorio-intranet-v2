import { PrismaClient } from "@prisma/client";
import bcryptjs from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  try {
    // Create default test user (admin)
    const hashedPassword = await bcryptjs.hash("johndoe123", 10);
    
    const testUser = await prisma.user.upsert({
      where: { email: "john@doe.com" },
      update: {},
      create: {
        email: "john@doe.com",
        name: "John Doe",
        password: hashedPassword,
        status: "approved",
        category: "Admin",
      },
    });

    console.log("Test user created/updated:", testUser);

    // Create default equipamentos
    const injetora = await prisma.equipamento.upsert({
      where: { id: "injetora-1" },
      update: {},
      create: {
        id: "injetora-1",
        nome: "Injetora Haake",
        descricao: "Injetora para testes de polimeros",
        status: "disponivel",
      },
    });

    console.log("Equipamento created:", injetora);

    // Create some default reagentes by direct create (checking existence first)
    const existingReagente = await prisma.reagente.findFirst({
      where: { nome: "Polipropileno" }
    });

    if (!existingReagente) {
      const reagente1 = await prisma.reagente.create({
        data: {
          nome: "Polipropileno",
          marca: "Braskem",
          volume: "1kg",
          localidade: "Armario A1",
          status: "ok",
        },
      });
      console.log("Reagente created:", reagente1);
    }

    console.log("Seed completed successfully");
  } catch (error) {
    console.error("Seed error:", error);
    process.exit(1);
  } finally {
    await prisma.$disconnect();
  }
}

main();
