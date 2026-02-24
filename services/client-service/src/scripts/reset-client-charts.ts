/**
 * Script to delete all charts for a specific client and regenerate them.
 * Run with: npx ts-node src/scripts/reset-client-charts.ts
 */

import { PrismaClient, ChartType } from "../generated/prisma";
import { astroEngineClient } from "../clients/astro-engine.client";

const prisma = new PrismaClient();

const CLIENT_ID = "643b18ed-7374-48ad-9599-7e41e87ea1ee";
const TENANT_ID = "00000000-0000-0000-0000-000000000000";

async function resetClientCharts() {
  console.log(`\n--- Reset Charts for Client: ${CLIENT_ID} ---\n`);

  try {
    // 1. Fetch Client Details
    const client = await prisma.client.findUnique({
      where: { id: CLIENT_ID },
    });

    if (!client) {
      console.error("Client not found!");
      return;
    }

    console.log(`Client: ${client.fullName}`);
    console.log(`Birth: ${client.birthDate?.toISOString().split("T")[0]} at ${client.birthTime}`);
    console.log(
      `Location: ${client.birthPlace} (${client.birthLatitude}, ${client.birthLongitude})`,
    );

    // 2. Delete ALL existing charts for this client
    console.log("\n[Step 1] Deleting existing charts...");
    const deleteResult = await prisma.clientSavedChart.deleteMany({
      where: { clientId: CLIENT_ID, tenantId: TENANT_ID },
    });
    console.log(`  ✓ Deleted ${deleteResult.count} chart(s).`);

    // 3. Prepare birth data for chart generation
    const birthData = {
      birthDate: client.birthDate?.toISOString().split("T")[0] || "1980-05-01",
      birthTime: client.birthTime ? client.birthTime.toISOString().slice(11, 19) : "12:00:00",
      latitude: client.birthLatitude ? client.birthLatitude.toNumber() : 0,
      longitude: client.birthLongitude ? client.birthLongitude.toNumber() : 0,
      timezoneOffset: 5.5, // India Standard Time
      userName: client.fullName,
    };
    console.log("\n[Step 2] Prepared Birth Data:", birthData);

    // 4. Generate D1 (Rashi) chart for Lahiri
    console.log("\n[Step 3] Generating D1 (Natal/Rashi) chart via Astro Engine...");
    const d1Response = await astroEngineClient.getNatalChart(birthData, "lahiri");
    console.log(
      "  ✓ D1 Chart Generated (Asc Sign:",
      d1Response.data?.ascendant?.sign || "N/A",
      ")",
    );

    // 5. Save the D1 chart to the database
    await prisma.clientSavedChart.create({
      data: {
        clientId: CLIENT_ID,
        tenantId: TENANT_ID,
        chartName: "Rashi (D1) - Lahiri",
        chartType: "D1" as ChartType,
        chartData: d1Response.data,
        chartConfig: { system: "lahiri" },
        calculatedAt: new Date(),
      },
    });
    console.log("  ✓ D1 Chart Saved to DB.");

    // 6. Generate D9 (Navamsha) chart for Lahiri
    console.log("\n[Step 4] Generating D9 (Navamsha) chart...");
    const d9Response = await astroEngineClient.getDivisionalChart(birthData, "D9", "lahiri");
    console.log(
      "  ✓ D9 Chart Generated (Asc Sign:",
      d9Response.data?.ascendant?.sign || "N/A",
      ")",
    );

    // 7. Save the D9 chart
    await prisma.clientSavedChart.create({
      data: {
        clientId: CLIENT_ID,
        tenantId: TENANT_ID,
        chartName: "Navamsha (D9) - Lahiri",
        chartType: "D9" as ChartType,
        chartData: d9Response.data,
        chartConfig: { system: "lahiri", varga: "D9" },
        calculatedAt: new Date(),
      },
    });
    console.log("  ✓ D9 Chart Saved to DB.");

    console.log("\n--- ✅ Client Chart Reset Complete! ---\n");
  } catch (error) {
    console.error("Script Error:", error);
  } finally {
    await prisma.$disconnect();
  }
}

resetClientCharts();
