import { PrismaClient } from "../generated/prisma";

const prisma = new PrismaClient();

async function main() {
  console.log("=== Multi-Client guru_chandal Check ===\n");

  // Get all distinct clients with yoga/dosha data
  const clients = await prisma.clientYogaDosha.groupBy({
    by: ["clientId"],
    _count: { id: true },
  });

  console.log(`Found ${clients.length} clients with yoga/dosha data\n`);

  for (const client of clients.slice(0, 5)) {
    const doshas = await prisma.clientYogaDosha.findMany({
      where: { clientId: client.clientId, category: "dosha" },
      select: { type: true },
    });
    const types = doshas.map((d) => d.type);
    const hasGC = types.includes("guru_chandal");
    console.log(
      `Client ${client.clientId.substring(0, 8)}... | doshas: ${types.length}/7 | guru_chandal: ${hasGC ? "✅" : "❌"} | types: [${types.join(", ")}]`,
    );
  }
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
