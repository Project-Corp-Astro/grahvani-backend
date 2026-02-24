import { BaseAstroClient } from "./base.client";
import { BirthData, SynastryData } from "../types";
import { WESTERN_ENDPOINTS } from "../constants";

// =============================================================================
// WESTERN ASTROLOGY CLIENT
// Handles Western (Tropical) system calculations
// =============================================================================

export class WesternClient extends BaseAstroClient {
  constructor() {
    super("western-client");
  }

  /**
   * Get Progressed Chart (secondary progressions)
   * @param data Birth data
   * @param progressedDate Date to progress chart to (YYYY-MM-DD)
   */
  async getProgressedChart(data: BirthData, progressedDate: string): Promise<any> {
    const payload = {
      ...this.buildPayload(data).valueOf(),
      progressed_date: progressedDate,
    };
    const response = await this.client.post(WESTERN_ENDPOINTS.PROGRESSED, payload);
    return response.data;
  }

  /**
   * Get Synastry Chart (chart comparison between two people)
   */
  async getSynastry(data: SynastryData): Promise<any> {
    const payload = {
      person1: this.buildPayload(data.person1),
      person2: this.buildPayload(data.person2),
    };
    const response = await this.client.post(WESTERN_ENDPOINTS.SYNASTRY, payload);
    return response.data;
  }

  /**
   * Get Composite Chart (midpoint chart for relationships)
   */
  async getComposite(data: SynastryData): Promise<any> {
    const payload = {
      person1: this.buildPayload(data.person1),
      person2: this.buildPayload(data.person2),
    };
    const response = await this.client.post(WESTERN_ENDPOINTS.COMPOSITE, payload);
    return response.data;
  }
}

export const westernClient = new WesternClient();
