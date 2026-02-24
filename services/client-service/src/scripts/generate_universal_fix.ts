import { PrismaClient } from "../generated/prisma";
import { chartService } from "../services/chart.service";
import { logger } from "../config";

const prisma = new PrismaClient();

async function fixUniversalCharts() {
  console.log("🚀 Starting Universal Chart generation for all clients...");

  const clients = await prisma.client.findMany({
    where: {
      birthDate: { not: null },
      birthTime: { not: null },
    },
  });

  console.log(`📊 Found ${clients.length} clients with valid birth data.`);

  const metadata = {
    userId: "00000000-0000-0000-0000-000000000000",
    ipAddress: "127.0.0.1",
    userAgent: "universal-fix-script",
  };

  for (const client of clients) {
    console.log(`🔍 Auditing universal charts for: ${client.fullName} (${client.id})`);

    try {
      // ensureFullVedicProfile now explicitly audits 'universal' pseudo-system
      await chartService.ensureFullVedicProfile(client.tenantId, client.id, metadata);
      console.log(`✅ Audit/Generation complete for ${client.fullName}`);
    } catch (err: any) {
      console.error(`❌ Failed for ${client.fullName}:`, err.message);
    }
  }

  console.log("🏁 Universal Chart fix process complete.");
}

fixUniversalCharts()
  .catch((err) => {
    console.error("💥 Fatal error during process:", err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
