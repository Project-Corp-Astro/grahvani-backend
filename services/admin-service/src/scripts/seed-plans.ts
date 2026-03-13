import { PrismaClient } from "../generated/prisma";

const prisma = new PrismaClient();

async function seedPlans() {
  console.log("🌱 Seeding subscription plans...");

  const plans = [
    {
      name: "Free",
      slug: "free",
      tier: "free",
      monthlyPrice: 0,
      maxClients: 2,
      maxChartsPerMonth: 10,
      isActive: true,
      hasKPSystem: false,
      hasMatchmaking: false,
    },
    {
      name: "Essential",
      slug: "essential",
      tier: "essential",
      monthlyPrice: 999,
      maxClients: 50,
      maxChartsPerMonth: 500,
      isActive: true,
      hasKPSystem: true,
      hasMatchmaking: false,
    },
    {
      name: "Professional",
      slug: "professional",
      tier: "professional",
      monthlyPrice: 2499,
      maxClients: 1000,
      maxChartsPerMonth: 5000,
      isActive: true,
      hasKPSystem: true,
      hasMatchmaking: true,
      hasPDFExport: true,
    },
  ];

  for (const plan of plans) {
    await prisma.subscriptionPlan.upsert({
      where: { slug: plan.slug },
      update: plan as any,
      create: plan as any,
    });
    console.log(`  - Plan '${plan.name}' synced.`);
  }

  console.log("✅ Plan seeding complete.");
}

seedPlans()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
