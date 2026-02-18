import { PrismaClient } from '../generated/prisma';

const prisma = new PrismaClient();

async function main() {
    let targetClientId = '6d273865-c684-4c5b-a8e4-60aa869db56b';
    let items = await prisma.clientYogaDosha.findMany({
        where: { clientId: targetClientId },
        select: {
            category: true,
            type: true,
            isPresent: true,
            analysisData: true
        }
    });

    if (items.length === 0) {
        console.log('No items found for default client. Searching for any client with data...');
        const anyItem = await prisma.clientYogaDosha.findFirst();
        if (anyItem) {
            targetClientId = anyItem.clientId;
            console.log('Found data for client:', targetClientId);
            items = await prisma.clientYogaDosha.findMany({
                where: { clientId: targetClientId },
                select: {
                    category: true,
                    type: true,
                    isPresent: true,
                    analysisData: true
                }
            });
        }
    }

    console.log(`Total records: ${items.length}`);
    const presentCount = items.filter(i => i.isPresent).length;
    console.log(`Stored as Present: ${presentCount}`);

    if (items.length > 0) {
        console.log('\n--- Sample Data Analysis by Type ---');

        // Group by type to get one sample per type
        const uniqueTypes = new Map();
        items.forEach(item => {
            if (!uniqueTypes.has(item.type)) {
                uniqueTypes.set(item.type, item);
            }
        });

        uniqueTypes.forEach((item, type) => {
            console.log(`\nType: ${type} | Category: ${item.category} | isPresent: ${item.isPresent}`);
            const data = item.analysisData;
            if (!data || typeof data !== 'object') {
                console.log('Data is null or not object');
                return;
            }

            const keys = Object.keys(data);
            //  console.log('Top level keys:', keys.join(', '));

            // Look for presence indicators
            const indicators: string[] = [];
            const findIndicators = (obj: any, path = '', depth = 0) => {
                if (!obj || typeof obj !== 'object' || depth > 2) return;
                for (const [key, val] of Object.entries(obj)) {
                    const currentPath = path ? `${path}.${key}` : key;
                    const lowerKey = key.toLowerCase();
                    if (
                        (typeof val === 'boolean' || typeof val === 'string' || typeof val === 'number') &&
                        (lowerKey.includes('present') || lowerKey.startsWith('has_') || lowerKey.includes('active') || lowerKey === 'status')
                    ) {
                        indicators.push(`${currentPath}: ${val}`);
                    } else if (typeof val === 'object' && val !== null) {
                        findIndicators(val, currentPath, depth + 1);
                    }
                }
            };
            findIndicators(data);
            console.log(`Presence Indicators: [${indicators.join(' | ')}]`);
        });
    }

    process.exit(0);
}

main().catch(console.error);
