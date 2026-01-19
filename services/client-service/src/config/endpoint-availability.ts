/**
 * Endpoint Availability Configuration
 * 
 * Defines which chart types and features are available per Ayanamsa system.
 * Based on actual external Astro Engine API capabilities.
 */

export type AyanamsaSystem = 'lahiri' | 'raman' | 'kp';

export interface SystemCapabilities {
    charts: string[];
    features: string[];
    specialCharts: string[];
    yogas?: string[];
    doshas?: string[];
    remedies?: string[];
    panchanga?: string[];
    hasDivisional: boolean;
    hasAshtakavarga: boolean;
    hasNumerology: boolean;
    hasHorary: boolean;
}

/**
 * Comprehensive capability matrix for each Ayanamsa system
 * Based on external Astro Engine API endpoint availability
 */
export const SYSTEM_CAPABILITIES: Record<AyanamsaSystem, SystemCapabilities> = {
    lahiri: {
        charts: ['D1', 'D2', 'D3', 'D4', 'D6', 'D7', 'D9', 'D10', 'D12', 'D16', 'D20', 'D24', 'D27', 'D30', 'D40', 'D45', 'D60', 'D150'],
        features: ['natal', 'transit', 'dasha', 'ashtakavarga', 'numerology', 'synastry', 'composite', 'progressed'],
        specialCharts: ['moon', 'sun', 'sudarshan', 'transit', 'arudha', 'arudha_lagna', 'bhava', 'bhava_lagna', 'hora', 'hora_lagna', 'sripathi', 'kp_bhava', 'equal_bhava', 'karkamsha', 'karkamsha_d1', 'karkamsha_d9', 'numerology_chaldean', 'numerology_loshu', 'shadbala'],
        yogas: ['gaja_kesari', 'guru_mangal', 'budha_aditya', 'chandra_mangal', 'raj_yoga', 'pancha_mahapurusha', 'daridra', 'dhan', 'malefic', 'rare', 'special', 'spiritual', 'shubh', 'vipreeta_raja', 'kalpadruma'],
        doshas: ['kala_sarpa', 'angarak', 'guru_chandal', 'shrapit', 'sade_sati', 'pitra'],
        remedies: ['yantra', 'mantra', 'general', 'gemstone', 'lal_kitab'],
        panchanga: ['panchanga', 'choghadiya', 'hora', 'lagna_times', 'muhurat'],
        hasDivisional: true,
        hasAshtakavarga: true,
        hasNumerology: true,
        hasHorary: false,
    },
    raman: {
        charts: ['D1', 'D2', 'D3', 'D4', 'D7', 'D9', 'D10', 'D12', 'D16', 'D20', 'D24', 'D27', 'D30', 'D40', 'D45', 'D60'],
        features: ['natal', 'transit', 'dasha', 'ashtakavarga'],
        specialCharts: ['moon', 'sun', 'sudarshan', 'transit', 'arudha', 'arudha_lagna', 'bhava', 'bhava_lagna', 'hora', 'hora_lagna', 'sripathi', 'kp_bhava', 'equal_bhava', 'karkamsha', 'karkamsha_d1', 'karkamsha_d9'],
        hasDivisional: true,
        hasAshtakavarga: true,
        hasNumerology: false,
        hasHorary: false,
    },
    kp: {
        // KP System: Specialized for prediction, NO divisional charts
        charts: ['D1'],
        features: ['natal', 'dasha', 'horary', 'significations', 'ruling_planets', 'bhava_details'],
        specialCharts: ['planets_cusps'],
        hasDivisional: false,
        hasAshtakavarga: false,
        hasNumerology: false,
        hasHorary: true,
    },
};

/**
 * Validate if a chart type is available for a system
 */
export function isChartAvailable(system: AyanamsaSystem, chartType: string): boolean {
    const capabilities = SYSTEM_CAPABILITIES[system];
    if (!capabilities) return false;

    const normalizedType = chartType.toLowerCase();
    const upperType = chartType.toUpperCase();

    return capabilities.charts.includes(upperType) ||
        capabilities.specialCharts.some(s => s.toLowerCase() === normalizedType);
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
 * Get available charts for a system
 */
export function getAvailableCharts(system: AyanamsaSystem): string[] {
    const capabilities = SYSTEM_CAPABILITIES[system];
    if (!capabilities) return ['D1'];

    return [...capabilities.charts, ...capabilities.specialCharts];
}

/**
 * Get system capabilities
 */
export function getSystemCapabilities(system: AyanamsaSystem): SystemCapabilities | null {
    return SYSTEM_CAPABILITIES[system] || null;
}
