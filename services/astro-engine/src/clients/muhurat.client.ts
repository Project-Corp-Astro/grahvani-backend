import { BaseAstroClient } from "./base.client";
import { MUHURAT_ENDPOINTS } from "../constants/muhurat-endpoints";
import type {
  MuhuratFindRequest,
  MuhuratEvaluateRequest,
  MuhuratCompatibilityRequest,
  MuhuratPanchangRequest,
  MuhuratInauspiciousRequest,
  MuhuratTimeQualityRequest,
  MuhuratInterpretRequest,
} from "../types/muhurat.types";

// =============================================================================
// MUHURAT CLIENT — Proxies all 9 Muhurat Engine endpoints
// Extended timeout (90s) for long-range date scans
// =============================================================================

export class MuhuratClient extends BaseAstroClient {
  constructor() {
    super("muhurat-engine");
    // /muhurat/find can scan up to 365 days — may take up to 90s
    this.client.defaults.timeout = 90000;
  }

  async findMuhurats(data: MuhuratFindRequest): Promise<unknown> {
    const response = await this.client.post(MUHURAT_ENDPOINTS.FIND, data);
    return response.data;
  }

  async evaluateDate(data: MuhuratEvaluateRequest): Promise<unknown> {
    const response = await this.client.post(MUHURAT_ENDPOINTS.EVALUATE, data);
    return response.data;
  }

  async checkCompatibility(data: MuhuratCompatibilityRequest): Promise<unknown> {
    const response = await this.client.post(MUHURAT_ENDPOINTS.COMPATIBILITY, data);
    return response.data;
  }

  async getEventTypes(): Promise<unknown> {
    const response = await this.client.get(MUHURAT_ENDPOINTS.EVENT_TYPES);
    return response.data;
  }

  async getInterpretation(data: MuhuratInterpretRequest): Promise<unknown> {
    const response = await this.client.post(MUHURAT_ENDPOINTS.INTERPRET, data);
    return response.data;
  }

  async getTraditions(): Promise<unknown> {
    const response = await this.client.get(MUHURAT_ENDPOINTS.TRADITIONS);
    return response.data;
  }

  async getPanchang(data: MuhuratPanchangRequest): Promise<unknown> {
    const response = await this.client.post(MUHURAT_ENDPOINTS.PANCHANG, data);
    return response.data;
  }

  async getInauspiciousWindows(data: MuhuratInauspiciousRequest): Promise<unknown> {
    const response = await this.client.post(MUHURAT_ENDPOINTS.INAUSPICIOUS_WINDOWS, data);
    return response.data;
  }

  async getTimeQuality(data: MuhuratTimeQualityRequest): Promise<unknown> {
    const response = await this.client.post(MUHURAT_ENDPOINTS.TIME_QUALITY, data);
    return response.data;
  }
}

export const muhuratClient = new MuhuratClient();
