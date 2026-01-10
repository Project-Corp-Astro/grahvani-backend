import { logger } from '../config';

export interface GeocodeResult {
    latitude: number;
    longitude: number;
    timezone: string;
    placeName: string;
    city?: string;
    state?: string;
    country?: string;
    countryCode?: string;
}

export interface LocationSuggestion {
    formatted: string;
    latitude: number;
    longitude: number;
    timezone: string;
    city?: string;
    state?: string;
    country?: string;
}

const GEOCODING_API_KEY = process.env.GEOCODING_API_KEY;
const OPENCAGE_BASE_URL = 'https://api.opencagedata.com/geocode/v1/json';

export class GeocodeService {
    /**
     * Get coordinates and timezone for a place name
     * Critical for accurate Vedic chart calculations - birth coordinates
     * directly affect planetary longitudes and house cusps
     */
    async geocodeBirthPlace(place: string): Promise<GeocodeResult> {
        logger.info({ place }, 'Geocoding birth place');

        if (!GEOCODING_API_KEY) {
            logger.warn('GEOCODING_API_KEY not configured, using fallback');
            return this.getFallbackResult(place);
        }

        try {
            const url = `${OPENCAGE_BASE_URL}?q=${encodeURIComponent(place)}&key=${GEOCODING_API_KEY}&limit=1&no_annotations=0`;
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`Geocoding API returned ${response.status}`);
            }

            const data = await response.json();

            if (!data.results || data.results.length === 0) {
                logger.warn({ place }, 'No geocoding results found');
                return this.getFallbackResult(place);
            }

            const result = data.results[0];
            const components = result.components || {};
            const annotations = result.annotations || {};

            return {
                latitude: result.geometry.lat,
                longitude: result.geometry.lng,
                timezone: annotations.timezone?.name || 'Asia/Kolkata',
                placeName: result.formatted,
                city: components.city || components.town || components.village || components.county,
                state: components.state,
                country: components.country,
                countryCode: components.country_code?.toUpperCase(),
            };
        } catch (error) {
            logger.error({ error, place }, 'Geocoding failed');
            return this.getFallbackResult(place);
        }
    }

    /**
     * Get location suggestions for autocomplete
     * Helps astrologers quickly find accurate birth places
     */
    async getLocationSuggestions(query: string, limit: number = 5): Promise<LocationSuggestion[]> {
        logger.info({ query }, 'Getting location suggestions');

        if (!GEOCODING_API_KEY || query.length < 2) {
            return [];
        }

        try {
            const url = `${OPENCAGE_BASE_URL}?q=${encodeURIComponent(query)}&key=${GEOCODING_API_KEY}&limit=${limit}&no_annotations=0`;
            const response = await fetch(url);

            if (!response.ok) {
                throw new Error(`Geocoding API returned ${response.status}`);
            }

            const data = await response.json();

            if (!data.results) {
                return [];
            }

            return data.results.map((result: any) => {
                const components = result.components || {};
                const annotations = result.annotations || {};

                return {
                    formatted: result.formatted,
                    latitude: result.geometry.lat,
                    longitude: result.geometry.lng,
                    timezone: annotations.timezone?.name || 'Asia/Kolkata',
                    city: components.city || components.town || components.village,
                    state: components.state,
                    country: components.country,
                };
            });
        } catch (error) {
            logger.error({ error, query }, 'Location suggestions failed');
            return [];
        }
    }

    /**
     * Fallback for common Indian cities when API fails
     * Most clients are from India, so we prioritize these
     */
    private getFallbackResult(place: string): GeocodeResult {
        const lowerPlace = place.toLowerCase();

        // Common astrology client locations in India
        const fallbacks: Record<string, Partial<GeocodeResult>> = {
            'delhi': { latitude: 28.6139, longitude: 77.2090, timezone: 'Asia/Kolkata', city: 'New Delhi', country: 'India' },
            'new delhi': { latitude: 28.6139, longitude: 77.2090, timezone: 'Asia/Kolkata', city: 'New Delhi', country: 'India' },
            'mumbai': { latitude: 19.0760, longitude: 72.8777, timezone: 'Asia/Kolkata', city: 'Mumbai', country: 'India' },
            'bangalore': { latitude: 12.9716, longitude: 77.5946, timezone: 'Asia/Kolkata', city: 'Bangalore', country: 'India' },
            'bengaluru': { latitude: 12.9716, longitude: 77.5946, timezone: 'Asia/Kolkata', city: 'Bengaluru', country: 'India' },
            'chennai': { latitude: 13.0827, longitude: 80.2707, timezone: 'Asia/Kolkata', city: 'Chennai', country: 'India' },
            'hyderabad': { latitude: 17.3850, longitude: 78.4867, timezone: 'Asia/Kolkata', city: 'Hyderabad', country: 'India' },
            'kolkata': { latitude: 22.5726, longitude: 88.3639, timezone: 'Asia/Kolkata', city: 'Kolkata', country: 'India' },
            'pune': { latitude: 18.5204, longitude: 73.8567, timezone: 'Asia/Kolkata', city: 'Pune', country: 'India' },
            'jaipur': { latitude: 26.9124, longitude: 75.7873, timezone: 'Asia/Kolkata', city: 'Jaipur', country: 'India' },
            'varanasi': { latitude: 25.3176, longitude: 82.9739, timezone: 'Asia/Kolkata', city: 'Varanasi', country: 'India' },
            'london': { latitude: 51.5074, longitude: -0.1278, timezone: 'Europe/London', city: 'London', country: 'United Kingdom' },
            'new york': { latitude: 40.7128, longitude: -74.0060, timezone: 'America/New_York', city: 'New York', country: 'United States' },
        };

        for (const [key, value] of Object.entries(fallbacks)) {
            if (lowerPlace.includes(key)) {
                return {
                    latitude: value.latitude!,
                    longitude: value.longitude!,
                    timezone: value.timezone!,
                    placeName: place,
                    city: value.city,
                    country: value.country,
                };
            }
        }

        // Default to Varanasi (spiritual center of India)
        return {
            latitude: 25.3176,
            longitude: 82.9739,
            timezone: 'Asia/Kolkata',
            placeName: place,
        };
    }
}

export const geocodeService = new GeocodeService();

