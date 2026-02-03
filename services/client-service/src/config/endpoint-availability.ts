/**
 * Endpoint Availability Configuration
 * 
 * Defines which chart types and features are available per Ayanamsa system.
 * Based on VERIFIED external Astro Engine API capabilities (ApiEndPoints.txt)
 * 
 * @version 2.0.0 - Updated 2026-01-21 based on actual API testing
 */

export type AyanamsaSystem = 'lahiri' | 'raman' | 'kp' | 'yukteswar' | 'western';

export interface SystemCapabilities {
    charts: string[];
    features: string[];
    specialCharts: string[];
    yogas?: string[];
    doshas?: string[];
    remedies?: string[];
    panchanga?: string[];
    dashas?: string[];
    hasDivisional: boolean;
    hasAshtakavarga: boolean;
    hasNumerology: boolean;
    hasHorary: boolean;
}

/**
 * Track endpoints that have failed - prevents repeated failed attempts
 * Key: "{system}:{chartType}", Value: timestamp of last failure
 */
const failedEndpoints = new Map<string, number>();
const FAILURE_RETRY_DELAY = 30000; // 30 seconds before retrying failed endpoint

/**
 * Check if an endpoint should be skipped due to recent failure
 */
export function shouldSkipEndpoint(system: AyanamsaSystem, chartType: string): boolean {
    const key = `${system}:${chartType.toLowerCase()}`;
    const lastFailure = failedEndpoints.get(key);
    if (!lastFailure) return false;
    return (Date.now() - lastFailure) < FAILURE_RETRY_DELAY;
}

/**
 * Mark an endpoint as failed (called on 404/500 errors)
 */
export function markEndpointFailed(system: AyanamsaSystem, chartType: string): void {
    const key = `${system}:${chartType.toLowerCase()}`;
    failedEndpoints.set(key, Date.now());
}

/**
 * Clear failure status for an endpoint
 */
export function clearEndpointFailure(system: AyanamsaSystem, chartType: string): void {
    const key = `${system}:${chartType.toLowerCase()}`;
    failedEndpoints.delete(key);
}

/**
 * Comprehensive capability matrix for each Ayanamsa system
 * 
 * VERIFIED against ApiEndPoints.txt on 2026-01-21
 * Only includes endpoints confirmed to be working
 */
export const SYSTEM_CAPABILITIES: Record<AyanamsaSystem, SystemCapabilities> = {
    lahiri: {
        // Divisional Charts - ALL verified working from ApiEndPoints.txt
        charts: ['D1', 'D2', 'D3', 'D4', 'D7', 'D9', 'D10', 'D12', 'D16', 'D20', 'D24', 'D27', 'D30', 'D40', 'D45', 'D60', 'D6', 'D150'],
        features: ['natal', 'transit', 'dasha', 'ashtakavarga', 'numerology', 'synastry', 'composite', 'progressed'],
        // Special Charts - verified endpoints
        specialCharts: [
            'moon', 'sun', 'sudarshan', 'transit', 'mandi', 'gulika', 'd40', 'd150',
            'ashtakavarga_sarva', 'ashtakavarga_bhinna', 'ashtakavarga_shodasha',
            'arudha_lagna', 'bhava_lagna', 'hora_lagna', 'sripathi_bhava', 'kp_bhava', 'equal_bhava',
            'karkamsha_d1', 'karkamsha_d9',
            'numerology_chaldean', 'numerology_loshu', 'person_numerology',
            'dasha_vimshottari', 'dasha_chara', 'dasha_tribhagi', 'dasha_tribhagi_40',
            'dasha_shodashottari', 'dasha_dwadashottari', 'dasha_panchottari', 'dasha_chaturshitisama',
            'dasha_satabdika', 'dasha_dwisaptati', 'dasha_shastihayani', 'dasha_shattrimshatsama',
            'dasha_summary'
        ],
        // Yogas - verified endpoints from ApiEndPoints.txt lines 134-150
        yogas: [
            'gaja_kesari', 'guru_mangal', 'budha_aditya', 'chandra_mangal', 'raj_yoga',
            'pancha_mahapurusha', 'daridra', 'dhan', 'malefic', 'special', 'spiritual',
            'shubh', 'viparitha_raja', 'kalpadruma', 'rare'
        ],
        // Doshas - verified endpoints lines 152-157
        doshas: ['kala_sarpa', 'angarak', 'guru_chandal', 'shrapit', 'sade_sati', 'pitra'],
        // Remedies - verified endpoints lines 159-164
        remedies: ['yantra', 'mantra', 'general', 'gemstone', 'lal_kitab'],
        // Panchanga - verified endpoints lines 166-173
        panchanga: ['panchanga', 'choghadiya', 'hora', 'lagna_times', 'muhurat'],
        // Dashas - verified endpoints
        dashas: [
            'vimshottari', 'tribhagi', 'tribhagi-40', 'ashtottari', 'shodashottari', 'dwadashottari', 'panchottari',
            'chaturshitisama', 'satabdika', 'dwisaptati', 'shastihayani', 'shattrimshatsama',
            'dasha_3months', 'dasha_6months', 'dasha_report_1year', 'dasha_report_2years', 'dasha_report_3years'
        ],
        hasDivisional: true,
        hasAshtakavarga: true,
        hasNumerology: true,
        hasHorary: false,
    },
    raman: {
        // Divisional Charts - ApiEndPoints.txt lines 13-27
        charts: ['D1', 'D2', 'D3', 'D4', 'D7', 'D9', 'D10', 'D12', 'D16', 'D20', 'D24', 'D27', 'D30', 'D40', 'D45', 'D60'],
        features: ['natal', 'transit', 'dasha', 'ashtakavarga'],
        // Special Charts - verified from ApiEndPoints.txt lines 6-36
        specialCharts: [
            'moon', 'sun', 'sripathi_bhava', 'sudarshan', 'transit',
            'ashtakavarga_sarva', 'ashtakavarga_bhinna', 'ashtakavarga_shodasha',
            'arudha_lagna', 'kp_bhava', 'equal_bhava',
            'karkamsha_d1', 'karkamsha_d9', 'bhava_lagna', 'hora_lagna'
        ],
        dashas: ['vimshottari'], // Lines 44-47
        hasDivisional: true,
        hasAshtakavarga: true,
        hasNumerology: false,
        hasHorary: false,
    },
    kp: {
        // KP System - ApiEndPoints.txt lines 183-196
        charts: ['D1'],
        features: ['natal', 'dasha', 'horary', 'significations', 'ruling_planets', 'bhava_details'],
        // KP-specific charts
        specialCharts: [
            'kp_planets_cusps', 'kp_ruling_planets', 'kp_bhava_details', 'kp_significations',
            'kp_house_significations', 'kp_planet_significators',
            'kp_interlinks', 'kp_interlinks_advanced', 'kp_interlinks_sl', 'kp_nakshatra_nadi', 'kp_fortuna',
            'kp_horary', 'chara_dasha', 'shodasha_varga_signs', 'muhurat'
        ],
        // Dashas listed in KP section lines 188-192
        dashas: ['vimshottari', 'chara'],
        hasDivisional: false,
        hasAshtakavarga: false,
        hasNumerology: false,
        hasHorary: true,
    },
    yukteswar: {
        charts: ['D1', 'D2', 'D3', 'D4', 'D7', 'D9', 'D10', 'D12', 'D16', 'D20', 'D24', 'D27', 'D30', 'D40', 'D45', 'D60'],
        features: ['natal', 'dasha', 'ashtakavarga'],
        specialCharts: [
            'sun_chart', 'moon_chart', 'equal_chart', 'sripathi_bhava', 'kp_bhava',
            'arudha_lagna', 'karakamsha_birth', 'karkamsha_d9', 'bhava_lagna', 'hora_lagna', 'gl_chart',
            'ashtakavarga_sarva', 'ashtakavarga_bhinna'
        ],
        dashas: [
            'mahaantar', 'pratyantar', 'sookshma', 'prana',
            'ashtottari_antar', 'ashtottari_pratyantardasha', 'tribhagi', 'tribhagi_40',
            'shodashottari', 'dwisaptatisama', 'shastihayani', 'shattrimshatsama',
            'panchottari', 'satabdika', 'chaturshitisama'
        ],
        hasDivisional: true,
        hasAshtakavarga: true,
        hasNumerology: false,
        hasHorary: false,
    },
    western: {
        charts: ['progressed', 'synastry', 'composite'],
        features: ['progressed', 'synastry', 'composite'],
        specialCharts: [],
        hasDivisional: false,
        hasAshtakavarga: false,
        hasNumerology: false,
        hasHorary: false,
    }
};

/**
 * Validate if a chart type is available for a system
 */
export function isChartAvailable(system: AyanamsaSystem, chartType: string): boolean {
    const capabilities = SYSTEM_CAPABILITIES[system];
    if (!capabilities) return false;

    // Check if endpoint is temporarily disabled due to failure
    if (shouldSkipEndpoint(system, chartType)) return false;

    const normalizedType = chartType.toLowerCase();
    const upperType = chartType.toUpperCase();

    return capabilities.charts.includes(upperType) ||
        capabilities.specialCharts.some(s => s.toLowerCase() === normalizedType) ||
        (capabilities.yogas?.some(s => `yoga:${s}` === normalizedType) ?? false) ||
        (capabilities.doshas?.some(s => `dosha:${s}` === normalizedType) ?? false) ||
        (capabilities.remedies?.some(s => `remedy:${s}` === normalizedType) ?? false) ||
        (capabilities.panchanga?.some(s => `panchanga:${s}` === normalizedType) ?? false) ||
        (capabilities.dashas?.some(s => `dasha_${s}` === normalizedType) ?? false);
}

/**
 * Validate if a feature is available for a system
 */
export function isFeatureAvailable(system: AyanamsaSystem, feature: string): boolean {
    const capabilities = SYSTEM_CAPABILITIES[system];
    if (!capabilities) return false;
    return capabilities.features.includes(feature.toLowerCase());
}

/**
 * Get available charts for a system (excluding failed endpoints)
 */
export function getAvailableCharts(system: AyanamsaSystem): string[] {
    const capabilities = SYSTEM_CAPABILITIES[system];
    if (!capabilities) return ['D1'];

    const allCharts = [...capabilities.charts, ...capabilities.specialCharts];

    // Filter out charts that have recently failed
    return allCharts.filter(chart => !shouldSkipEndpoint(system, chart));
}

/**
 * Get system capabilities
 */
export function getSystemCapabilities(system: AyanamsaSystem): SystemCapabilities | null {
    return SYSTEM_CAPABILITIES[system] || null;
}

/**
 * Get list of endpoints that have failed
 */
export function getFailedEndpoints(): { key: string; failedAt: number }[] {
    return Array.from(failedEndpoints.entries()).map(([key, failedAt]) => ({ key, failedAt }));
}
