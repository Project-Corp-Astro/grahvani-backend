const axios = require('axios');

const birthData = {
    userName: "test_verified_user",
    birthDate: "1990-01-01",
    birthTime: "12:00:00",
    latitude: 28.6139,
    longitude: 77.2090,
    timezoneOffset: 5.5,
    ayanamsa: "lahiri"
};

async function testEndpoint(name, url, payload) {
    try {
        console.log(`Testing ${name}: ${url}...`);
        const response = await axios.post(url, payload);
        console.log(`  ${name} Success status:`, response.status);
        // console.log(`  ${name} Data:`, JSON.stringify(response.data).substring(0, 100) + '...');
    } catch (error) {
        console.error(`  ${name} Error status:`, error.response?.status);
        console.error(`  ${name} Error data:`, JSON.stringify(error.response?.data));
    }
}

async function runTests() {
    // Local astro-engine URL (internal routes)
    const base = 'http://localhost:3014/internal';

    console.log("--- Verifying fixes against LOCAL astro-engine ---");

    // Test 1: chart_remedies - Should succeed because we normalize time to HH:MM internally
    await testEndpoint('Chart Remedies', `${base}/remedy/chart_remedies`, birthData);

    // Test 2: lal_kitab - Should succeed because we provide defaults for planet/house internally
    await testEndpoint('Lal Kitab', `${base}/remedy/lal_kitab`, birthData);

    // Test 3: Natal (baseline)
    await testEndpoint('Natal', `${base}/natal`, birthData);
}

runTests();
