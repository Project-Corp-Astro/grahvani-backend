
const { PrismaClient } = require('../generated/prisma');
const prisma = new PrismaClient();

async function main() {
    console.log('--- DB Check ---');
    try {
        const clientCount = await prisma.client.count();
        console.log(`Clients: ${clientCount}`);

        const yogaCount = await prisma.clientYogaDosha.count();
        console.log(`YogaDoshas: ${yogaCount}`);

        if (yogaCount > 0) {
            const sample = await prisma.clientYogaDosha.findFirst();
            console.log('Sample ID:', sample.id);
        }
    } catch (e) {
        console.error('DB Error:', e);
    } finally {
        await prisma.$disconnect();
    }
}

main();
