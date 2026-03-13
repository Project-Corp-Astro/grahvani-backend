import { featurePolicyService } from "./services/feature-policy.service";
import { getPrismaClient } from "./config/database";

async function testResolution() {
  const prisma = getPrismaClient();
  
  // Find a user with a subscription
  const sub = await prisma.userSubscription.findFirst({
    include: { plan: true }
  });

  if (!sub) {
    console.log("❌ No user subscription found to test resolution.");
    return;
  }

  console.log(`🔍 Testing capability resolution for User: ${sub.userId} (Plan: ${sub.plan.name})`);
  
  const caps = await featurePolicyService.resolveUserCapabilities(sub.userId);
  console.log("✅ Resolved Capabilities:", JSON.stringify(caps, null, 2));
}

testResolution()
  .catch(console.error)
  .finally(() => getPrismaClient().$disconnect());
