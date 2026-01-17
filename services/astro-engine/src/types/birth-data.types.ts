// =============================================================================
// BIRTH DATA TYPES
// =============================================================================

/**
 * Ayanamsa calculation systems
 */
export type AyanamsaType = 'lahiri' | 'kp' | 'raman';

/**
 * Standard birth data required for all calculations
 */
export interface BirthData {
    birthDate: string;      // YYYY-MM-DD format
    birthTime: string;      // HH:MM:SS format
    latitude: number;       // -90 to 90
    longitude: number;      // -180 to 180
    timezoneOffset: number; // Hours offset from UTC (e.g., 5.5 for IST)
    userName?: string;      // Optional identifier
    ayanamsa?: AyanamsaType;
    system?: AyanamsaType;
}

/**
 * Horary-specific birth data
 */
export interface HoraryData extends BirthData {
    horaryNumber: number;   // 1-249
    question: string;
}

/**
 * Synastry requires two birth data sets
 */
export interface SynastryData {
    person1: BirthData;
    person2: BirthData;
}

/**
 * Numerology requires name in addition to birth data
 */
export interface NumerologyData extends BirthData {
    name: string;
}
