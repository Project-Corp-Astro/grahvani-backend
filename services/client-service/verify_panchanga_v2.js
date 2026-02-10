const { PrismaClient } = require("./src/generated/prisma");
const axios = require("axios");

async function verifyAndDebug() {
  const clientId = "96cc1c9e-1d19-4aa3-8055-eaaec597ec31";
  const tenantId = "00000000-0000-0000-0000-000000000000";

  const prisma = new PrismaClient();

  try {
    console.log("Checking for universal charts for client Tumul...");
    const existing = await prisma.clientSavedChart.findMany({
      where: {
        clientId: clientId,
        system: "universal",
      },
    });

    console.log(`Currently has ${existing.length} universal charts.`);
    existing.forEach((c) => console.log(`- ${c.chartType}`));

    // If missing, we can try to trigger it via the astro-engine directly to verify connectivity
    // But the best is to see the auto-healing work.
    // Since I can't easily trigger the exact service method without a full setup,
    // I will just check if the logic I added is sound by inspecting the code again.
  } catch (err) {
    console.error("Error:", err);
  } finally {
    await prisma.$disconnect();
  }
}

verifyAndDebug();
