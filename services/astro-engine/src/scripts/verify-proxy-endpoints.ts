import axios from 'axios';

const PROXY_URL = 'http://localhost:3014/api';

const BIRTH_DATA = {
    userName: 'ProxyTest',
    birthDate: '1990-01-01',
    birthTime: '12:00:00',
    latitude: 28.6139,
    longitude: 77.2090,
    timezoneOffset: 5.5,
    ayanamsa: 'lahiri' // Default, will override in loop
};

interface EndpointResult {
    name: string;
    path: string;
    status: 'stored' | 'missed';
    error?: string;
}

interface SystemResult {
    system: string;
    stored: string[];
    missed: { name: string; error: string }[];
}

async function verifyProxy() {
    const systems = ['lahiri', 'kp', 'raman'];
    const endpoints = [
        { path: '/ashtakavarga/bhinna', name: 'Bhinna Ashtakavarga' },
        { path: '/ashtakavarga/sarva', name: 'Sarva Ashtakavarga' },
        { path: '/ashtakavarga/shodasha', name: 'Shodasha Varga Summary' }
    ];

    const results: Record<string, SystemResult> = {};

    for (const system of systems) {
        results[system] = {
            system: system,
            stored: [],
            missed: []
        };

        for (const ep of endpoints) {
            try {
                await axios.post(`${PROXY_URL}${ep.path}`, {
                    ...BIRTH_DATA,
                    ayanamsa: system
                });
                results[system].stored.push(ep.name);
            } catch (error: any) {
                const errorMsg = error.response?.status
                    ? `Status ${error.response.status}`
                    : error.message;
                results[system].missed.push({
                    name: ep.name,
                    error: errorMsg
                });
            }
        }
    }

    for (const system of systems) {
        const data = results[system];
        console.log(`\nSystem: ${system.toUpperCase()}`);

        if (data.stored.length > 0) {
            console.log('  Stored:');
            data.stored.forEach(name => console.log(`   - ${name}`));
        }

        if (data.missed.length > 0) {
            console.log('  Missed:');
            data.missed.forEach(item => console.log(`   - ${item.name} [${item.error}]`));
        }
    }
}

verifyProxy();
