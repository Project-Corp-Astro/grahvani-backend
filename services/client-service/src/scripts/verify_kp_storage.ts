
import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

async function checkKpData() {
    try {
        console.log('Checking for KP data in client_saved_charts...');

        const kpCharts = await prisma.clientSavedChart.findMany({
            where: {
                system: 'kp',
                chartType: {
                    in: ['kp_chart', 'transit', 'kp_bhava', 'shadbala', 'muhurat']
                }
            },
            take: 10,
            orderBy: {
                createdAt: 'desc'
            },
            select: {
                id: true,
                clientId: true,
                chartType: true,
                createdAt: true,
                system: true
            }
        });

        if (kpCharts.length === 0) {
            console.log('No KP charts found in the database.');
        } else {
            console.log(`Found ${kpCharts.length} KP charts:`);
            kpCharts.forEach(chart => {
                console.log(`- Type: ${chart.chartType}, Client: ${chart.clientId}, Created: ${chart.createdAt.toISOString()}`);
            });
        }
    } catch (error) {
        console.error('Error checking KP data:', error);
    } finally {
        await prisma.$disconnect();
    }
}

checkKpData();
