
export { };
const axios = require('axios');

// Using the default URL from config if env var is missing, but hardcoding for the script to be sure.
// astro-client.ts uses 'https://astroengine.astrocorp.in' as fallback.
const ASTRO_URL = process.env.ASTRO_ENGINE_EXTERNAL_URL || 'https://astroengine.astrocorp.in';

const payload = {
    user_name: 'Verification Script',
    birth_date: '1990-08-15',
    birth_time: '10:30:00',
    latitude: '28.6139',
    longitude: '77.2090',
    timezone_offset: 5.5,
    system: 'lahiri'
};

async function verify() {
    console.log(`Checking Astro Engine at: ${ASTRO_URL}`);

    try {
        console.log("---- Fetching TRIBHAGI (80y) ----");
        const t1 = await axios.post(`${ASTRO_URL}/lahiri/calculate_tribhagi_dasha`, payload);
        console.log("Status:", t1.status);
        const keys1 = Object.keys(t1.data);
        console.log("Keys:", keys1);
        const periods1 = t1.data.tribhagi_dashas_janma || t1.data.mahadashas || [];
        if (periods1.length > 0) {
            console.log("First 3 Periods (80y):", JSON.stringify(periods1.slice(0, 3), null, 2));
        }

        console.log("\n---- Fetching TRIBHAGI-40 (40y) ----");
        const t2 = await axios.post(`${ASTRO_URL}/lahiri/tribhagi-dasha-40`, payload);
        console.log("Status:", t2.status);
        const keys2 = Object.keys(t2.data);
        console.log("Keys:", keys2);
        const periods2 = t2.data.mahadashas || t2.data.tribhagi_dashas_janma || [];
        if (periods2.length > 0) {
            console.log("First 3 Periods (40y from mahadashas):", JSON.stringify(periods2.slice(0, 3), null, 2));
        }

        if (t2.data.tribhagi_dasha_info) {
            console.log("Tribhagi Dasha Info:", JSON.stringify(t2.data.tribhagi_dasha_info, null, 2).substring(0, 500));
        }

        // Comparison
        if (periods1.length > 0 && periods2.length > 0 && periods1[0].start_date === periods2[0].start_date && periods1[0].end_date === periods2[0].end_date) {
            console.error("\n[CRITICAL] FIRST PERIOD DATES ARE IDENTICAL!");
        } else {
            console.log("\n[SUCCESS] Dates differ.");
        }

    } catch (error: any) {
        console.error("Error:", error.message);
        if (error.response) {
            console.error("Data:", error.response.data);
        }
    }
}

verify();
