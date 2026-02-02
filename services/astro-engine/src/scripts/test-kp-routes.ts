import axios from 'axios';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.join(__dirname, '../../.env') });

const ASTRO_URL = process.env.ASTRO_ENGINE_URL || 'http://localhost:5001';

const BIRTH_DATA = {
    user_name: 'TestKP',
    birth_date: '1990-05-15',
    birth_time: '12:00:00',
    latitude: '28.6139',
    longitude: '77.2090',
    timezone_offset: 5.5,
    system: 'kp'
};

async function testKP() {
    console.log(`Testing Astro Engine at: ${ASTRO_URL}`);

    const endpoints = [
        '/kp/cusps_chart',
        '/kp/ruling-planets',
        '/kp/calculate_bhava_details',
        '/kp/calculate_significations'
    ];

    for (const ep of endpoints) {
        try {
            console.log(`\nTesting ${ep}...`);
            const res = await axios.post(`${ASTRO_URL}${ep}`, BIRTH_DATA);
            console.log(`✅ Success (200) for ${ep}`);
            console.log(`   Data Sample: ${JSON.stringify(res.data).substring(0, 100)}...`);
        } catch (error: any) {
            console.error(`❌ Failed for ${ep}: ${error.response?.status || error.message}`);
            if (error.response?.data) console.log('   Error Data:', error.response.data);
        }
    }
}

testKP();
