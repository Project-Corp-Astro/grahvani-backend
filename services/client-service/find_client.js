const { PrismaClient } = require("./src/generated/prisma");
const prisma = new PrismaClient();

async function findClient() {
  try {
    const client = await prisma.client.findFirst({
      where: {
        fullName: {
          contains: "Tumul",
          mode: "insensitive",
        },
      },
    });

    if (client) {
      console.log(
        `Found client: ${client.fullName}, ID: ${client.id}, TenantID: ${client.tenantId}`,
      );
    } else {
      console.log("Client not found");
    }
  } catch (err) {
    console.error("Error finding client:", err);
  } finally {
    await prisma.$disconnect();
  }
}

findClient();
