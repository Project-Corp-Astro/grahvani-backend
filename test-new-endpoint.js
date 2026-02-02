const axios = require('axios');

const BASE_URL = 'https://astroengine.astrocorp.in';
const ENDPOINT = '/kp/calculate_house_significations';

const payload = {
    user_name: 'test_user',
    birth_date: '1990-01-01',
    birth_time: '12:00:00',
    latitude: '28.6139',
    longitude: '77.2090',
    timezone_offset: 5.5,
    system: 'kp'
};

async function inspectEndpoint() {
    try {
        const response = await axios.post(BASE_URL + ENDPOINT, payload);
        console.log(`[SUCCESS] ${ENDPOINT}`);
        console.log('Response keys:', Object.keys(response.data));
        console.log('Sample Data:', JSON.stringify(response.data, null, 2).substring(0, 500));
    } catch (error) {
        console.log(`[FAILED] ${ENDPOINT}: ${error.message} ${error.response ? error.response.status : ''}`);
    }
}

inspectEndpoint();
