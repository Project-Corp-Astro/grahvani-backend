// =============================================================================
// API RESPONSE TYPES
// =============================================================================

/**
 * Standard API response wrapper
 */
export interface ApiResponse<T = any> {
    success: boolean;
    data: T;
    cached: boolean;
    calculatedAt: string;
    error?: string;
}

/**
 * Planet position in a chart
 */
export interface PlanetPosition {
    sign: string;
    degrees: string;
    retrograde: boolean;
    house: number;
    nakshatra: string;
    pada: number;
}

/**
 * Ascendant details
 */
export interface Ascendant {
    sign: string;
    degrees: string;
    nakshatra: string;
    pada: number;
}

/**
 * Natal chart response structure
 */
export interface NatalChartResponse {
    user_name: string;
    birth_details: {
        birth_date: string;
        birth_time: string;
        latitude: number;
        longitude: number;
        timezone_offset: number;
    };
    planetary_positions: Record<string, PlanetPosition>;
    ascendant: Ascendant;
    notes: {
        ayanamsa: string;
        ayanamsa_value: string;
        chart_type: string;
        house_system: string;
    };
}

/**
 * KP Planets/Cusps response
 */
export interface KpPlanetsCuspsResponse {
    user_name: string;
    ascendant: {
        longitude: string;
        sign: string;
    };
    house_cusps: Record<string, {
        longitude: string;
        sign: string;
        nakshatra: string;
        star_lord: string;
        sub_lord: string;
    }>;
    planets: Record<string, {
        longitude: string;
        sign: string;
        nakshatra: string;
        star_lord: string;
        sub_lord: string;
        house: number;
    }>;
    significators: Record<string, string[]>;
}

/**
 * Dasha period structure
 */
export interface DashaPeriod {
    planet: string;
    startDate: string;
    endDate: string;
    subPeriods?: DashaPeriod[];
}

/**
 * Vimshottari Dasha response
 */
export interface VimshottariDashaResponse {
    user_name: string;
    birth_details: any;
    mahadasha_periods: DashaPeriod[];
}
