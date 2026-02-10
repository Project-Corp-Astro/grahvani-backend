const { PrismaClient } = require("./src/generated/prisma");
const prisma = new PrismaClient();

async function checkUniversalCharts() {
  try {
    const charts = await prisma.clientSavedChart.findMany({
      where: {
        system: "universal",
      },
      take: 10,
      orderBy: {
        calculatedAt: "desc",
      },
    });

    console.log(`Found ${charts.length} universal charts:`);
    charts.forEach((c) => {
      console.log(
        `- ${c.chartType}: Client ${c.clientId}, Calculated at: ${c.calculatedAt}`,
      );
    });
  } catch (err) {
    console.error("Error checking charts:", err);
  } finally {
    await prisma.$disconnect();
  }
}

checkUniversalCharts();
