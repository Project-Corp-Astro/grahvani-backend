
interface DashaPeriod {
    planet: string;
    start_date: string; // ISO string
    end_date: string;   // ISO string
    duration_years: number;
}

const DASHA_YEARS: Record<string, number> = {
    "Sun": 6, "Moon": 10, "Mars": 7, "Rahu": 18, "Jupiter": 16,
    "Saturn": 19, "Mercury": 17, "Ketu": 7, "Venus": 20
};

const PLANET_ORDER = ["Ketu", "Venus", "Sun", "Moon", "Mars", "Rahu", "Jupiter", "Saturn", "Mercury"];

/**
 * Calculate sub-periods for a given parent period.
 * @param parentPlanet The planet ruling the parent period
 * @param parentStart ISO date string of parent start
 * @param parentDurationYears Duration of parent in years (e.g. Mahadasha years if Level 1, or fraction if deeper)
 * @param parentEnd Optional ISO date string of parent end (used if duration is missing)
 */
export function calculateSubPeriods(
    parentPlanet: string,
    parentStart: string | Date,
    parentDurationYears?: number,
    parentEnd?: string | Date
): DashaPeriod[] {
    const parentPlanetName = normalizePlanet(parentPlanet);
    let startIndex = PLANET_ORDER.indexOf(parentPlanetName);

    if (startIndex === -1) {
        startIndex = PLANET_ORDER.findIndex(p => parentPlanetName.includes(p) || p.includes(parentPlanetName));
        if (startIndex === -1) return [];
    }

    // 1. Validate Start Date
    const start = new Date(parentStart);
    if (isNaN(start.getTime())) {
        return [];
    }

    // 2. Resolve Duration
    let duration = parentDurationYears;
    if (typeof duration !== 'number' || isNaN(duration)) {
        if (parentEnd) {
            const end = new Date(parentEnd);
            if (!isNaN(end.getTime()) && end > start) {
                const diffMs = end.getTime() - start.getTime();
                duration = diffMs / (365.25 * 24 * 60 * 60 * 1000);
            }
        }
    }

    // If still no valid duration, we cannot calculate
    if (typeof duration !== 'number' || isNaN(duration) || duration <= 0) {
        return [];
    }

    const subPeriods: DashaPeriod[] = [];
    let currentDate = new Date(start);

    for (let i = 0; i < 9; i++) {
        const index = (startIndex + i) % 9;
        const planet = PLANET_ORDER[index];
        const planetYears = DASHA_YEARS[planet];

        const subDuration = (duration * planetYears) / 120;

        // Calculate End Date safely
        let endDate: Date;
        try {
            endDate = addYears(currentDate, subDuration);
        } catch (e) {
            // Should not happen with valid inputs, but safety net
            endDate = new Date(currentDate.getTime() + 1000);
        }

        subPeriods.push({
            planet: planet,
            start_date: currentDate.toISOString(),
            end_date: endDate.toISOString(),
            duration_years: subDuration
        });

        currentDate = endDate;
    }

    return subPeriods;
}

function normalizePlanet(p: string): string {
    // Basic normalization capital case
    if (!p) return "";
    const lower = p.toLowerCase();
    return PLANET_ORDER.find(n => n.toLowerCase() === lower) || p;
}

function addYears(date: Date, years: number): Date {
    const newDate = new Date(date);
    // Convert years to milliseconds: years * 365.2425 * 24 * 60 * 60 * 1000
    // Or closer approximation.
    // However, JS Date works well.
    // Vimshottari uses 360 day years? Or 365.25?
    // Usually 365.25 (Sidereal/Julian) or 360 (Savana).
    // Engines vary. Standard Julian (365.25) is safer for UI dates unless specifically Savana.
    // Astro Engine usually returns Julian.

    const msPerYear = 365.25 * 24 * 60 * 60 * 1000;
    const time = newDate.getTime() + (years * msPerYear);
    return new Date(time);
}
