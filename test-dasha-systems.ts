/**
 * Test Script: Alternative Dasha Systems
 * 
 * This script demonstrates testing all alternative Dasha systems
 * integrated into the Grahvani backend.
 * 
 * Usage: npx ts-node test-dasha-systems.ts
 */

import axios from 'axios';

// Configuration
const API_BASE_URL = 'http://localhost:3008/api/v1';
const CLIENT_ID = 'c1c213b3-2383-431c-b0f4-83ce56b10840';
const AUTH_TOKEN = process.env.AUTH_TOKEN || 'your-token-here';

// Define all Dasha systems to test
const DASHA_SYSTEMS = [
    { name: 'Tribhagi', param: 'tribhagi' },
    { name: 'Tribhagi 40', param: 'tribhagi-40' },
    { name: 'Shodashottari', param: 'shodashottari' },
    { name: 'Dwadashottari', param: 'dwadashottari' },
    { name: 'Panchottari', param: 'panchottari' },
    { name: 'Shattrimshatsama', param: 'shattrimshatsama' },
    { name: 'Chaturshitisama', param: 'chaturshitisama' },
    { name: 'Shastihayani', param: 'shastihayani' },
    { name: 'Satabdika', param: 'satabdika' },
    { name: 'Dwisaptati', param: 'dwisaptati' },
    { name: 'Other (Default to Tribhagi)', param: 'other' },
];

interface DashaResponse {
    clientId: string;
    clientName: string;
    dashaType: string;
    level: string;
    ayanamsa: string;
    data: any;
    cached: boolean;
    calculatedAt: string;
}

async function testDashaSystem(system: { name: string; param: string }): Promise<void> {
    try {
        console.log(`\n📌 Testing ${system.name}...`);
        
        const startTime = Date.now();
        
        const response = await axios.post<DashaResponse>(
            `${API_BASE_URL}/clients/${CLIENT_ID}/dasha/${system.param}`,
            {
                ayanamsa: 'lahiri',
                level: 'mahadasha',
                save: false,
            },
            {
                headers: {
                    'Authorization': `Bearer ${AUTH_TOKEN}`,
                    'Content-Type': 'application/json',
                },
                timeout: 30000,
            }
        );

        const duration = Date.now() - startTime;
        const data = response.data;

        console.log(`✅ ${system.name} - SUCCESS`);
        console.log(`   Duration: ${duration}ms`);
        console.log(`   Cached: ${data.cached}`);
        console.log(`   Client: ${data.clientName}`);
        console.log(`   Dasha Type: ${data.dashaType}`);
        console.log(`   Data Points: ${JSON.stringify(data.data).length} bytes`);
        
    } catch (error: any) {
        console.log(`❌ ${system.name} - FAILED`);
        if (error.response) {
            console.log(`   Status: ${error.response.status}`);
            console.log(`   Message: ${error.response.data?.message || error.message}`);
        } else {
            console.log(`   Error: ${error.message}`);
        }
    }
}

async function testVimshottariDasha(): Promise<void> {
    try {
        console.log(`\n📌 Testing Vimshottari Dasha (Default)...`);
        
        const startTime = Date.now();
        
        const response = await axios.post<any>(
            `${API_BASE_URL}/clients/${CLIENT_ID}/dasha`,
            {
                level: 'mahadasha',
                ayanamsa: 'lahiri',
            },
            {
                headers: {
                    'Authorization': `Bearer ${AUTH_TOKEN}`,
                    'Content-Type': 'application/json',
                },
                timeout: 30000,
            }
        );

        const duration = Date.now() - startTime;
        const data = response.data;

        console.log(`✅ Vimshottari Dasha - SUCCESS`);
        console.log(`   Duration: ${duration}ms`);
        console.log(`   Level: ${data.level}`);
        console.log(`   Client: ${data.clientName}`);
        console.log(`   Data Points: ${JSON.stringify(data.data).length} bytes`);
        
    } catch (error: any) {
        console.log(`❌ Vimshottari Dasha - FAILED`);
        if (error.response) {
            console.log(`   Status: ${error.response.status}`);
            console.log(`   Message: ${error.response.data?.message || error.message}`);
        } else {
            console.log(`   Error: ${error.message}`);
        }
    }
}

async function runTests(): Promise<void> {
    console.log('🚀 Starting Dasha Systems Test Suite');
    console.log(`📍 API Base: ${API_BASE_URL}`);
    console.log(`👤 Client ID: ${CLIENT_ID}`);
    console.log(`🔑 Auth Token: ${AUTH_TOKEN.substring(0, 10)}...`);
    console.log(`⏰ Timestamp: ${new Date().toISOString()}`);
    console.log('─'.repeat(60));

    // Test Vimshottari first
    await testVimshottariDasha();

    // Test all alternative Dasha systems
    for (const system of DASHA_SYSTEMS) {
        await testDashaSystem(system);
        // Add delay between requests to avoid overwhelming the server
        await new Promise(resolve => setTimeout(resolve, 500));
    }

    console.log('\n' + '─'.repeat(60));
    console.log('✨ Test Suite Complete!');
    console.log(`   Total Systems Tested: ${DASHA_SYSTEMS.length + 1}`);
    console.log(`   Timestamp: ${new Date().toISOString()}`);
}

// Run the tests
runTests().catch(error => {
    console.error('Test suite failed:', error);
    process.exit(1);
});
