const axios = require('axios');

const birthData = {
    userName: "test_user",
    birthDate: "1990-01-01",
    birthTime: "12:00:00",
    latitude: 28.6139,
    longitude: 77.2090,
    timezoneOffset: 5.5,
    ayanamsa: "lahiri"
};

const payload = {
    user_name: birthData.userName,
    birth_date: birthData.birthDate,
    birth_time: birthData.birthTime,
    latitude: String(birthData.latitude),
    longitude: String(birthData.longitude),
    timezone_offset: birthData.timezoneOffset,
    system: "lahiri",
    ayanamsa: "lahiri"
};

async function testEndpoint(name, url, customPayload) {
    try {
        console.log(`Testing ${name}: ${url}...`);
        const response = await axios.post(url, customPayload);
        console.log(`  ${name} Success status:`, response.status);
    } catch (error) {
        console.error(`  ${name} Error status:`, error.response?.status);
        console.error(`  ${name} Error data:`, JSON.stringify(error.response?.data));
    }
}

async function runTests() {
    const base = 'https://astroengine.astrocorp.in';

    // Test 1: chart-with-remedies with HH:MM:SS
    await testEndpoint('Chart with Remedies (HH:MM:SS)', `${base}/lahiri/chart-with-remedies`, payload);

    // Test 2: chart-with-remedies with HH:MM
    await testEndpoint('Chart with Remedies (HH:MM)', `${base}/lahiri/chart-with-remedies`, {
        ...payload,
        birth_time: "12:00"
    });

    // Test 3: Lal Kitab with planet/house
    await testEndpoint('Lal Kitab (Sun, 1)', `${base}/lahiri/lal-kitab-remedies`, {
        ...payload,
        planet: "Sun",
        house: 1
    });
}

runTests();
