import axios from 'axios';

const PROXY_URL = 'http://localhost:3014/api';

const BIRTH_DATA = {
    userName: 'ProxyTest',
    birthDate: '1990-01-01',
    birthTime: '12:00:00',
    latitude: 28.6139,
    longitude: 77.2090,
    timezoneOffset: 5.5,
    ayanamsa: 'lahiri'
};

async function verifyProxy() {
    console.log('--- Verifying Node.js Proxy Endpoints ---');
    console.log(`Target: ${PROXY_URL}`);

    const systems = ['lahiri', 'kp', 'raman'];
    const endpoints = [
        { path: '/ashtakavarga/bhinna', name: 'Bhinna Ashtakavarga' },
        { path: '/ashtakavarga/sarva', name: 'Sarva Ashtakavarga' },
        { path: '/ashtakavarga/shodasha', name: 'Shodasha Varga Summary' }
    ];

    for (const system of systems) {
        console.log(`\nTesting System: ${system.toUpperCase()}`);
        for (const ep of endpoints) {
            try {
                process.stdout.write(`  - ${ep.name}... `);
                const res = await axios.post(`${PROXY_URL}${ep.path}`, {
                    ...BIRTH_DATA,
                    ayanamsa: system
                });
                console.log(`✅ Success (200)`);
                // Sample check for data structure
                if (ep.path.includes('shodasha')) {
                    const keys = Object.keys(res.data.data);
                    process.stdout.write(`    (Data sample: ${keys.slice(0, 3).join(', ')}...)\n`);
                }
            } catch (error: any) {
                console.log(`❌ Failed: ${error.response?.status || error.message}`);
                if (error.response?.data) {
                    console.log('    Error Detail:', JSON.stringify(error.response.data).substring(0, 200));
                }
            }
        }
    }

    console.log('\n--- Proxy Verification Finished ---');
}

verifyProxy();
