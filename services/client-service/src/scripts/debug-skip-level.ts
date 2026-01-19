// @ts-nocheck
import { astroEngineClient } from '../clients/astro-engine.client';
import { calculateSubPeriods } from '../utils/vimshottari-calc';

async function debugSkipLevel() {
    const birthData = {
        birthDate: '1990-01-01',
        birthTime: '10:00:00',
        latitude: 19.076,
        longitude: 72.877,
        timezoneOffset: 5.5,
        system: 'lahiri'
    };

    // Scenario: User wants Sookshma list for Mercury Pratyantar.
    // Parent Chain: Saturn (Maha) > Saturn (Antar) > Mercury (Prat).
    // Engine provides: Saturn > Saturn. (Stops at Level 2).
    // System must calc Level 3 (Prat), pick Mercury, then Calc Level 4 (Sookshma).

    // We mock the service logic here.

    console.log('Fetching Root...');
    const res = await astroEngineClient.getVimshottariDasha(birthData, 'mahadasha');
    const rootList = res.data.dasha_list || res.data.mahadashas || [];

    const contextLords = ['Saturn', 'Saturn', 'Mercury']; // Maha, Antar, Prat. Target children of Mercury.

    let lastParent = null;
    let processedIndex = 0;

    // 1. Engine Traversal
    console.log('--- Engine Traversal ---');
    let currentNodes = rootList;
    for (let i = 0; i < contextLords.length; i++) {
        const lord = contextLords[i];
        console.log(`Looking for ${lord} (Depth ${i + 1})...`);
        const node = currentNodes.find((n: any) => n.planet === lord);
        if (node) {
            lastParent = node;
            processedIndex = i + 1;
            console.log(`Found ${lord}.`);

            const nextLevel = node.sublevels || node.antardashas || node.pratyantardashas;
            if (nextLevel && nextLevel.length > 0) {
                currentNodes = nextLevel;
                console.log(`  Has children. Descending.`);
            } else {
                console.log(`  No children. Engine Stop.`);
                break;
            }
        } else {
            console.log(`  Not found. Stop.`);
            break;
        }
    }

    console.log(`Processed Depth: ${processedIndex}. Context Length: ${contextLords.length}`);

    // 2. Recursive Calculation
    console.log('--- Recursive Calculation ---');
    if (lastParent && processedIndex < contextLords.length) {
        for (let i = processedIndex; i < contextLords.length; i++) {
            const targetLord = contextLords[i];
            console.log(`Calculating children of ${lastParent.planet} to find ${targetLord}...`);

            const children = calculateSubPeriods(
                lastParent.planet,
                lastParent.start_date,
                lastParent.duration_years,
                lastParent.end_date
            );

            const nextNode = children.find(c => c.planet === targetLord);
            if (nextNode) {
                console.log(`  Found ${targetLord} in calculated list.`);
                console.log(`  Start: ${nextNode.start_date}, End: ${nextNode.end_date}`);
                lastParent = nextNode;
            } else {
                console.log(`  Target lord not found!`);
                break;
            }
        }
    }

    // 3. Final List
    console.log('--- Final Generation ---');
    console.log(`Generating children for final parent: ${lastParent.planet}`);
    const finalList = calculateSubPeriods(
        lastParent.planet,
        lastParent.start_date,
        lastParent.duration_years,
        lastParent.end_date
    );

    console.log(`Generated ${finalList.length} items.`);
    if (finalList.length > 0) {
        console.log(`Item 0: ${finalList[0].planet} (${finalList[0].start_date} - ${finalList[0].end_date})`);
        // Verify Duration
        const start = new Date(finalList[0].start_date);
        const end = new Date(finalList[0].end_date);
        const days = (end - start) / (1000 * 60 * 60 * 24);
        console.log(`Duration Days: ${days.toFixed(2)}`);
    }

}

debugSkipLevel().then(() => process.exit(0));
