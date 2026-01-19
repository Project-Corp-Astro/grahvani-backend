// @ts-nocheck
import { astroEngineClient } from '../clients/astro-engine.client';

async function debugPranaContext() {
    const birthData = {
        birthDate: '1990-01-01',
        birthTime: '10:00:00',
        latitude: 19.076,
        longitude: 72.877,
        timezoneOffset: 5.5,
        system: 'lahiri',
        // Try nested context
        context: {
            mahaLord: 'Venus',
            antarLord: 'Venus',
            pratyantarLord: 'Venus',
            sookshmaLord: 'Venus'
        }
    };

    console.log('Testing /dasha/prana with nested context...');
    try {
        const res = await (astroEngineClient as any).internalClient.post('/dasha/prana', birthData);
        const list = res.data.dasha_list || res.data.prana_dasha || res.data || [];

        if (Array.isArray(list) && list.length > 0) {
            console.log('Sample 0:', JSON.stringify(list[0], null, 2));
        } else {
            console.log('Data:', JSON.stringify(res.data, null, 2));
        }

    } catch (e) { console.log(e.message); }
}

debugPranaContext().then(() => process.exit(0));
