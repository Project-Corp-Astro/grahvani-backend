import { getPrismaClient } from "./config/database";

async function checkTransitChart() {
  const prisma = getPrismaClient();
  console.log("Connecting to DB...");

  // Find a client who has a transit chart
  const client = await prisma.client.findFirst({
    where: {
      savedCharts: {
        some: {
          chartType: "transit",
        },
      },
    },
    include: {
      savedCharts: {
        where: {
          chartType: "transit",
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
      },
    },
  });

  if (!client) {
    console.log("No client found with a transit chart.");
  } else {
    console.log(`Found client: ${client.id} (${client.fullName})`);
    const chart = client.savedCharts[0];
    console.log("--- TRANSIT CHART METADATA ---");
    console.log(`ID: ${chart.id}`);
    console.log(`System: ${chart.system}`);
    console.log(`Created At: ${chart.createdAt}`);

    console.log("--- RAW CHART DATA (First 500 chars) ---");
    const dataStr = JSON.stringify(chart.chartData, null, 2);
    console.log(dataStr.substring(0, 500));

    console.log("--- KEY STRUCTURE ---");
    if (typeof chart.chartData === "object") {
      console.log(Object.keys(chart.chartData as object));
    }

    // Check specifically for parsing fields
    const data: any = chart.chartData;
    const hasPositions = !!(data.planetary_positions || data.planets);
    console.log(`Has 'planetary_positions' or 'planets': ${hasPositions}`);
    console.log(`Has 'Sun' direct key: ${!!data.Sun}`);
  }

  process.exit(0);
}

checkTransitChart().catch(console.error);
