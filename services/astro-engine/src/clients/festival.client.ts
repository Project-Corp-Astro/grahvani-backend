import { BaseAstroClient } from "./base.client";

/**
 * Interface for basic festival location/time inputs
 */
export interface FestivalParams {
  year?: number;
  date?: string; // YYYY-MM-DD
  month?: number; // 1-12
  latitude?: number;
  longitude?: number;
  timezone?: string;
  festival_id?: string;
  include_recurring?: boolean;
  categories?: string[];
  region?: string | null;
  limit?: number;
}

export class FestivalClient extends BaseAstroClient {
  constructor() {
    super("astro-engine-festival");
  }

  /**
   * Helper to format payload specifically for the Festival Engine
   * Removes undefined fields so we don't send garbage to Python
   */
  private buildFestivalPayload(params: FestivalParams): Record<string, any> {
    const payload: Record<string, any> = {};
    
    if (params.year !== undefined) payload.year = params.year;
    if (params.date !== undefined) payload.date = params.date;
    if (params.month !== undefined) payload.month = params.month;
    
    // Apply defaults if location is missing (matches API documentation default for Delhi)
    payload.latitude = params.latitude !== undefined ? params.latitude : 28.6139;
    payload.longitude = params.longitude !== undefined ? params.longitude : 77.2090;
    payload.timezone = params.timezone !== undefined ? params.timezone : "Asia/Kolkata";

    if (params.festival_id !== undefined) payload.festival_id = params.festival_id;
    if (params.include_recurring !== undefined) payload.include_recurring = params.include_recurring;
    if (params.categories !== undefined) payload.categories = params.categories;
    if (params.region !== undefined) payload.region = params.region;
    if (params.limit !== undefined) payload.limit = params.limit;

    return payload;
  }

  // 1. Full Festival Calendar
  async getCalendar(params: FestivalParams) {
    const response = await this.client.post("/festival/calendar", this.buildFestivalPayload(params));
    return response.data;
  }

  // 2. Festival by ID
  async getFestivalById(params: FestivalParams) {
    const response = await this.client.post("/festival/by-id", this.buildFestivalPayload(params));
    return response.data;
  }

  // 3. Festivals by Date
  async getFestivalsByDate(params: FestivalParams) {
    const response = await this.client.post("/festival/by-date", this.buildFestivalPayload(params));
    return response.data;
  }

  // 4. Festivals by Month
  async getFestivalsByMonth(params: FestivalParams) {
    const response = await this.client.post("/festival/by-month", this.buildFestivalPayload(params));
    return response.data;
  }

  // 5. Government Holidays
  async getHolidays(params: FestivalParams) {
    const response = await this.client.post("/festival/holidays", this.buildFestivalPayload(params));
    return response.data;
  }

  // 6. Lunar Month Mapping
  async getLunarMonths(params: FestivalParams) {
    const response = await this.client.post("/festival/lunar-months", this.buildFestivalPayload(params));
    return response.data;
  }

  // 7. All Ekadashis
  async getEkadashis(params: FestivalParams) {
    const response = await this.client.post("/festival/ekadashis", this.buildFestivalPayload(params));
    return response.data;
  }

  // 8. All Sankrantis
  async getSankrantis(params: FestivalParams) {
    const response = await this.client.post("/festival/sankrantis", this.buildFestivalPayload(params));
    return response.data;
  }

  // 9. Major Festivals
  async getMajorFestivals(params: FestivalParams) {
    const response = await this.client.post("/festival/major", this.buildFestivalPayload(params));
    return response.data;
  }

  // 10. Regional Festivals
  async getRegionalFestivals(params: FestivalParams) {
    const response = await this.client.post("/festival/regional", this.buildFestivalPayload(params));
    return response.data;
  }

  // 11. Upcoming Festivals
  async getUpcomingFestivals(params: FestivalParams) {
    const response = await this.client.post("/festival/upcoming", this.buildFestivalPayload(params));
    return response.data;
  }

  // 12. Available Categories
  async getCategories() {
    const response = await this.client.get("/festival/categories");
    return response.data;
  }
}

export const festivalClient = new FestivalClient();
