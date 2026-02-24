import { jest } from "@jest/globals";

// Mock global fetch before importing the service
const mockFetch = jest.fn() as jest.Mock;
global.fetch = mockFetch as any;

// Must import after mocks
import { GeocodeService } from "../services/geocode.service";

describe("GeocodeService", () => {
  let geocodeService: GeocodeService;

  beforeEach(() => {
    geocodeService = new GeocodeService();
    mockFetch.mockReset();
  });

  describe("geocodeBirthPlace", () => {
    it("returns fallback when API key is not configured", async () => {
      // GEOCODING_API_KEY is undefined in test env
      const result = await geocodeService.geocodeBirthPlace("Mumbai");

      expect(result.latitude).toBe(19.076);
      expect(result.longitude).toBe(72.8777);
      expect(result.timezone).toBe("Asia/Kolkata");
    });

    it("returns Delhi fallback coordinates", async () => {
      const result = await geocodeService.geocodeBirthPlace("New Delhi");

      expect(result.latitude).toBe(28.6139);
      expect(result.longitude).toBe(77.209);
      expect(result.city).toBe("New Delhi");
    });

    it("returns Varanasi as default fallback for unknown places", async () => {
      const result = await geocodeService.geocodeBirthPlace(
        "Unknown Village XYZ",
      );

      expect(result.latitude).toBe(25.3176);
      expect(result.longitude).toBe(82.9739);
      expect(result.timezone).toBe("Asia/Kolkata");
      expect(result.placeName).toBe("Unknown Village XYZ");
    });

    it("handles Bangalore/Bengaluru aliases", async () => {
      const r1 = await geocodeService.geocodeBirthPlace("Bangalore");
      const r2 = await geocodeService.geocodeBirthPlace("Bengaluru");

      expect(r1.latitude).toBe(r2.latitude);
      expect(r1.longitude).toBe(r2.longitude);
    });

    it("returns London fallback for international city", async () => {
      const result = await geocodeService.geocodeBirthPlace("London");

      expect(result.latitude).toBe(51.5074);
      expect(result.longitude).toBe(-0.1278);
      expect(result.timezone).toBe("Europe/London");
    });
  });

  describe("getLocationSuggestions", () => {
    it("returns empty array when API key is not set", async () => {
      const result = await geocodeService.getLocationSuggestions("Mumbai");

      expect(result).toEqual([]);
    });

    it("returns empty array for single character query", async () => {
      const result = await geocodeService.getLocationSuggestions("M");

      expect(result).toEqual([]);
    });
  });
});
