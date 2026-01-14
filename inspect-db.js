const { PrismaClient } = require('./services/client-service/src/generated/prisma');
const prisma = new PrismaClient();

async function main() {
    try {
        const clients = await prisma.client.findMany({
            select: {
                id: true,
                fullName: true,
                tenantId: true,
                deletedAt: true,
                phonePrimary: true,
                email: true,
                createdBy: true
            }
        });
        console.log('--- ALL CLIENTS IN DB ---');
        console.table(clients);

        const tenants = [...new Set(clients.map(c => c.tenantId))];
        console.log('Unique Tenants:', tenants);

        const activeClients = clients.filter(c => !c.deletedAt);
        console.log('Active Clients Count:', activeClients.length);
        console.table(activeClients);

    } catch (err) {
        console.error(err);
    } finally {
        await prisma.$disconnect();
    }
}

main();
