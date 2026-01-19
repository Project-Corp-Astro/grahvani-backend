// @ts-nocheck
import { astroEngineClient } from '../clients/astro-engine.client';

async function debugDates() {
    console.log('Debugging Dasha Dates...');

    const birthData = {
        birthDate: '1990-01-01',
        birthTime: '10:00:00',
        latitude: 19.076,
        longitude: 72.877,
        timezoneOffset: 5.5,
        system: 'lahiri'
    };

    try {
        // 1. Fetch Mahadashas
        console.log('\n1. Fetching MAHADASHAS...');
        const mahaRes = await astroEngineClient.getVimshottariDasha(birthData, 'mahadasha');
        console.log(JSON.stringify(mahaRes, null, 2));
        process.exit(0);

        if (mahadashas.length === 0) {
            console.log('No Mahadashas found.');
            return;
        }

        const firstMaha = mahadashas[0];
        console.log(`First Mahadasha: ${firstMaha.planet} (${firstMaha.start_date} to ${firstMaha.end_date})`);

        // 2. Fetch Antardashas for this Maha
        console.log(`\n2. Fetching ANTARDASHAS for ${firstMaha.planet}...`);
        const antarRes = await astroEngineClient.getVimshottariDasha(birthData, 'antardasha', {
            mahaLord: firstMaha.planet
        });
        const antardashas = antarRes.dasha_list || [];

        console.log(`Found ${antardashas.length} Antardashas.`);
        // Log first 3 to check dates
        antardashas.slice(0, 3).forEach((ad, i) => {
            console.log(`   [${i}] ${ad.planet}: ${ad.start_date} to ${ad.end_date}`);
        });

        // Check if dates are identical to Maha
        if (antardashas.length > 0) {
            if (antardashas[0].start_date === firstMaha.start_date && antardashas[antardashas.length - 1].end_date === firstMaha.end_date) {
                console.log('\n[Observation] First Antar start matches Maha start. Last matches Maha end. This is expected.');
            }
            if (antardashas[0].start_date === firstMaha.start_date && antardashas[0].end_date === firstMaha.end_date) {
                console.log('\n[CRITICAL ISSUE SOURCE] Antardasha has SAME end date as Mahadasha! It implies it spans the whole duration.');
            } else {
                console.log('\n[Good] Antardasha end date differs from Mahadasha end date.');
            }
        }

    } catch (e) {
        console.error('Debug failed:', e.message);
        if (e.response) console.log('Err Data:', e.response.data);
    }
}

debugDates().then(() => {
    console.log('Done.');
    process.exit(0);
});
