import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

async function main() {
    const clientId = '6d273865-c684-4c5b-a8e4-60aa869db56b';
    console.log('Inspecting data for client:', clientId);

    const items = await prisma.clientYogaDosha.findMany({
        where: { clientId },
        select: {
            category: true,
            type: true,
            isPresent: true,
            analysisData: true
        }
    });

    console.log(`Total records: ${items.length}`);
    const presentCount = items.filter(i => i.isPresent).length;
    console.log(`Stored as Present: ${presentCount}`);

    if (items.length > 0) {
        console.log('\n--- Sample Data Analysis ---');

        // Specific check for PITRA DOSHA
        const pitra = items.find(i => i.type === 'pitra' && i.category === 'dosha');
        if (pitra) {
            console.log(`\n*** VERIFICATION TARGET: PITRA DOSHA ***`);
            console.log(`Stored isPresent: ${pitra.isPresent}`);
            console.log(`Calculated At: ${new Date().toISOString()}`); // approximated
        } else {
            console.log(`\n*** VERIFICATION TARGET: PITRA DOSHA NOT FOUND ***`);
        }

        items.slice(0, 5).forEach(item => {
            console.log(`\nType: ${item.type} | Category: ${item.category} | isPresent: ${item.isPresent}`);
            // Log top-level keys of analysisData to see structure
            const data = item.analysisData;
            console.log('Top level keys:', Object.keys(data || {}));

            // Look for common presence indicators in the JSON
            const indicators: string[] = [];
            const findIndicators = (obj: any, path = '') => {
                if (!obj || typeof obj !== 'object') return;
                for (const [key, val] of Object.entries(obj)) {
                    const currentPath = path ? `${path}.${key}` : key;
                    if (typeof val === 'boolean' && (key.includes('present') || key.includes('has_') || key.includes('active'))) {
                        indicators.push(`${currentPath}: ${val}`);
                    } else if (typeof val === 'object' && val !== null) {
                        findIndicators(val, currentPath);
                    }
                }
            };
            findIndicators(data);
            console.log('Presence indicators found in JSON:', indicators);
        });
    }

    process.exit(0);
}

main().catch(console.error);
