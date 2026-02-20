import { PrismaClient } from "../generated/prisma";

const prisma = new PrismaClient();

async function main() {
  console.log("=== Database Cleanup: Removing yoga_kala_sarpa ===\n");

  // 1. Check client_yoga_doshas
  const yogaDoshaCount = await prisma.clientYogaDosha.count({
    where: {
      category: "yoga",
      type: "kala_sarpa",
    },
  });
  console.log(
    `Found ${yogaDoshaCount} records in client_yoga_doshas with category='yoga' and type='kala_sarpa'`,
  );

  if (yogaDoshaCount > 0) {
    const deleted = await prisma.clientYogaDosha.deleteMany({
      where: {
        category: "yoga",
        type: "kala_sarpa",
      },
    });
    console.log(`✅ Deleted ${deleted.count} records from client_yoga_doshas`);
  }

  // 2. Check client_saved_charts
  const savedChartCount = await prisma.clientSavedChart.count({
    where: {
      chartType: "yoga_kala_sarpa" as any,
    },
  });
  console.log(
    `Found ${savedChartCount} records in client_saved_charts with chartType='yoga_kala_sarpa'`,
  );

  if (savedChartCount > 0) {
    const deleted = await prisma.clientSavedChart.deleteMany({
      where: {
        chartType: "yoga_kala_sarpa" as any,
      },
    });
    console.log(`✅ Deleted ${deleted.count} records from client_saved_charts`);
  }

  console.log("\nCleanup complete.");
}

main()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
