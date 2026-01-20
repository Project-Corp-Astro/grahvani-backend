const { PrismaClient } = require('./services/client-service/src/generated/prisma');
const prisma = new PrismaClient();

async function main() {
    console.log('Updating NULL system values to "lahiri"...');
    const result = await prisma.clientSavedChart.updateMany({
        where: { system: null },
        data: { system: 'lahiri' }
    });
    console.log(`Updated ${result.count} records.`);
}

main()
    .catch(e => {
        console.error(e);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
