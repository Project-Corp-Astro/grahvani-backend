console.log("Step 1: Script started");

try {
  const { PrismaClient } = require("../generated/prisma");
  console.log("Step 2: Prisma Client imported");

  const prisma = new PrismaClient();
  console.log("Step 3: Prisma Client instantiated");

  const main = async () => {
    console.log("Step 4: Connecting to DB...");
    await prisma.$connect();
    console.log("Step 5: Connected!");
    await prisma.$disconnect();
    console.log("Step 6: Disconnected");
  };

  main().catch((e) => console.error(e));
} catch (e) {
  console.error("Error:", e);
}
