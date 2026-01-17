import { PrismaClient } from '../generated/prisma';
import { chartService } from '../services/chart.service';
import { logger } from '../config';

const prisma = new PrismaClient();

async function backfill() {
    console.log('Starting chart backfill for all clients...');

    const clients = await prisma.client.findMany({
        where: {
            birthDate: { not: null },
            birthTime: { not: null },
            birthLatitude: { not: null },
            birthLongitude: { not: null }
        }
    });

    console.log(`Found ${clients.length} clients with valid birth data.`);

    for (const client of clients) {
        console.log(`Generating core charts for: ${client.fullName} (${client.id})`);

        const metadata = {
            userId: '00000000-0000-0000-0000-000000000000',
            ipAddress: '127.0.0.1',
            userAgent: 'v-astrology-backfill-script'
        };

        try {
            await chartService.generateCoreCharts(client.tenantId, client.id, metadata);
            console.log(`Successfully generated charts for ${client.fullName}`);
        } catch (err) {
            console.error(`Failed to generate charts for ${client.fullName}:`, err);
        }
    }

    console.log('Backfill process complete.');
}

backfill()
    .catch(err => {
        console.error('Fatal error during backfill:', err);
        process.exit(1);
    })
    .finally(async () => {
        await prisma.$disconnect();
    });
