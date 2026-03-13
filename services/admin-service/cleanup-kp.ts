import { PrismaClient } from "./src/generated/prisma";

const prisma = new PrismaClient();

async function main() {
  console.log("Cleaning up duplicate KP Ayanamsa feature...");
  
  try {
    const deleted = await prisma.platformFeature.deleteMany({
      where: { featureKey: "core:kp_ayanamsa" }
    });
    console.log(`Successfully deleted ${deleted.count} record(s).`);
  } catch (error) {
    console.error("Error deleting feature:", error);
  }

  await prisma.$disconnect();
}

main().catch(console.error);
