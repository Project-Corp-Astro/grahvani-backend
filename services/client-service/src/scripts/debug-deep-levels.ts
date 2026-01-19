// @ts-nocheck
import { astroEngineClient } from '../clients/astro-engine.client';

async function debugDeep() {
    const birthData = {
        birthDate: '1990-01-01',
        birthTime: '10:00:00',
        latitude: 19.076,
        longitude: 72.877,
        timezoneOffset: 5.5,
        system: 'lahiri'
    };

    console.log('Testing Pratyantar Fetch (Level 3)...');
    // Assume Maha=Venus, Antar=Venus (First one usually)
    const context = { mahaLord: 'Venus', antarLord: 'Venus' };

    console.log('Context:', context);
    const res = await astroEngineClient.getVimshottariDasha(birthData, 'pratyantar', context);

    const data = res.data || res;
    // Keys?
    console.log('Keys:', Object.keys(data));

    // Check if dasha_list exists
    const list = data.dasha_list || data.pratyantardashas || [];
    console.log('List Length:', list.length);

    if (data.mahadashas) {
        console.log('Found mahadashas root key.');
        console.log(JSON.stringify(data.mahadashas, null, 2));
    }

    if (list.length > 0) {
        console.log('Sample Item 0:', JSON.stringify(list[0], null, 2));
        console.log('Sample Item 1:', JSON.stringify(list[1], null, 2));

        // Check if dates match parent (approx 20 years for Venus Maha?)
        // Venus Maha: 1990 + ?
        // Venus Antar: 1990-1994 approx?
        // Venus Pratyantar: should be few months.

        const d0 = list[0];
        const d1 = list[1];
        if (d0.start_date === d1.start_date && d0.end_date === d1.end_date) {
            console.log('[ERROR] Items have identical dates!');
        } else {
            console.log('[OK] Items have different dates.');
        }
    }
}

debugDeep().then(() => process.exit(0));
