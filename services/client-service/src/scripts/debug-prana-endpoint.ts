// @ts-nocheck
import { astroEngineClient } from '../clients/astro-engine.client';

async function debugPranaEndpoint() {
    const birthData = {
        birthDate: '1990-01-01',
        birthTime: '10:00:00',
        latitude: 19.076,
        longitude: 72.877,
        timezoneOffset: 5.5,
        system: 'lahiri',
        // Try passing context in body (snake_case and camelCase)
        mahaLord: 'Venus',
        antarLord: 'Venus',
        pratyantarLord: 'Venus',
        sookshmaLord: 'Venus',
        maha_lord: 'Venus',
        antar_lord: 'Venus',
        pratyantar_lord: 'Venus',
        sookshma_lord: 'Venus'
    };

    console.log('Testing /dasha/prana endpoint...');
    try {
        // We bypass the wrapper method to control payload exactly
        const res = await (astroEngineClient as any).internalClient.post('/dasha/prana', birthData);
        const data = res.data;

        console.log('Keys:', Object.keys(data));

        const list = data.dasha_list || data.prana_dasha || data.data?.dasha_list || [];
        console.log('List Length:', list.length);

        if (list.length > 0) {
            console.log('Sample 0:', JSON.stringify(list[0], null, 2));
            // Check if it's Venus > Venus...
            if (list[0].planet === 'Venus' || list[0].planet === 'Ketu') { // Ketu is first if not Venus?
                // If it returns list starting with Ketu, it might be ignoring context (Start of Vimshottari for this birth).
                // Venus is Lord at birth? 1990 is Venus Maha.
                // So if it returns Venus, it might respect context OR birth time.
            }
        } else {
            console.log('Full Data Dump:', JSON.stringify(data, null, 2));
        }

    } catch (e) {
        console.log('Error:', e.message);
        if (e.response) console.log('Status:', e.response.status, e.response.data);
    }
}

debugPranaEndpoint().then(() => process.exit(0));
