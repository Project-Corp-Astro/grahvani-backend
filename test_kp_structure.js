const axios = require('axios');

const BASE_URL = 'https://astroengine.astrocorp.in';

const payload = {
    user_name: 'test_user',
    birth_date: '1990-01-01',
    birth_time: '12:00:00',
    latitude: '28.6139',
    longitude: '77.2090',
    timezone_offset: 5.5,
    system: 'kp'
};

async function testEndpoint(path, name) {
    try {
        console.log(`\n--- Testing ${name} (${path}) ---`);
        const response = await axios.post(BASE_URL + path, payload);
        const data = response.data;

        // Log structure
        if (data.significators) {
            console.log('Found "significators" object.');
            console.log('Keys:', Object.keys(data.significators).slice(0, 5));
            // Check first entry structure
            const firstKey = Object.keys(data.significators)[0];
            console.log(`Sample Entry [${firstKey}]:`, JSON.stringify(data.significators[firstKey], null, 2));
        } else if (data.data && data.data.significators) { // Wrapped validation
            console.log('Found "data.significators" object.');
            const firstKey = Object.keys(data.data.significators)[0];
            console.log(`Sample Entry [${firstKey}]:`, JSON.stringify(data.data.significators[firstKey], null, 2));
        } else {
            console.log('No direct "significators" object found. Root Keys:', Object.keys(data));
            // Check if it returns house-wise data directly
            if (data['1'] && data['1'].occupants) {
                console.log('Looks like House-wise structure. Sample House 1:', JSON.stringify(data['1'], null, 2));
            }
        }
    } catch (error) {
        console.error(`ERROR: ${error.message} (${error.response ? error.response.status : 'N/A'})`);
    }
}

async function run() {
    await testEndpoint('/kp/calculate_house_significations', 'FIRST TABLE (House)');
    await testEndpoint('/kp/planets-significators', 'SECOND TABLE (Planet)');
}

run();
