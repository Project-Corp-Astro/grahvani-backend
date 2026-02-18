import { astroEngineClient } from '../clients/astro-engine.client';
import { logger } from '../config/logger';

// Mock logger to keep output clean
logger.info = () => { };
logger.debug = () => { };
logger.warn = () => { };
logger.error = console.error;

const YOGAS = ['budha_aditya'];

const DOSHAS = ['kala_sarpa'];

const SAMPLE_BIRTH_DATA = {
    birthDate: '1990-01-01',
    birthTime: '12:00:00',
    latitude: 28.6139,
    longitude: 77.2090,
    timezoneOffset: 5.5,
    userName: 'Test User'
};

async function analyze() {
    console.log('| Category | Type | Presence Key | Sample Value | Top Level Keys |');
    console.log('|---|---|---|---|---|');

    // Analyze Yogas
    for (const type of YOGAS) {
        try {
            const response = await astroEngineClient.getYogaAnalysis(SAMPLE_BIRTH_DATA, type);
            const data = response.data;
            const analysis = analyzeJson(data);
            console.log(`| Yoga | ${type} | ${analysis.presenceKey} | ${analysis.value} | ${analysis.keys} |`);
        } catch (e: any) {
            console.log(`| Yoga | ${type} | ERROR | ${e.message} | - |`);
        }
    }

    // Analyze Doshas
    for (const type of DOSHAS) {
        try {
            const response = await astroEngineClient.getDoshaAnalysis(SAMPLE_BIRTH_DATA, type);
            const data = response.data;
            const analysis = analyzeJson(data);
            console.log(`| Dosha | ${type} | ${analysis.presenceKey} | ${analysis.value} | ${analysis.keys} |`);
        } catch (e: any) {
            console.log(`| Dosha | ${type} | ERROR | ${e.message} | - |`);
        }
    }
}

function analyzeJson(data: any): { presenceKey: string, value: any, keys: string } {
    if (!data || typeof data !== 'object') return { presenceKey: 'INVALID', value: 'N/A', keys: 'N/A' };

    const keys = Object.keys(data).join(', ');
    let presenceKey = 'NOT_FOUND';
    let value: any = 'N/A';

    // Specific key search
    const candidates = [
        'is_present', 'present', 'status',
        'yoga_present', 'dosha_present',
        'has_yoga', 'has_dosha',
        'sade_sati_active', 'is_manglik',
        'has_kala_sarpa', 'has_pitra_dosha'
    ];

    // 1. Exact top-level match
    for (const k of candidates) {
        if (k in data) {
            return { presenceKey: k, value: data[k], keys };
        }
        // Also check dynamic keys like "{type}_present"
        const dynamicKey = Object.keys(data).find(dk => dk.endsWith('_present') || dk.startsWith('has_') || dk.endsWith('_active'));
        if (dynamicKey) {
            return { presenceKey: dynamicKey, value: data[dynamicKey], keys };
        }
    }

    // 2. Recursive search if not found at top level
    // (Simplified for this script - just check one level deep)
    for (const k of Object.keys(data)) {
        if (typeof data[k] === 'object' && data[k] !== null) {
            const result = analyzeJson(data[k]);
            if (result.presenceKey !== 'NOT_FOUND') {
                return { presenceKey: `${k}.${result.presenceKey}`, value: result.value, keys };
            }
        }
    }

    return { presenceKey, value, keys };
}

analyze().catch(console.error).finally(() => process.exit(0));
