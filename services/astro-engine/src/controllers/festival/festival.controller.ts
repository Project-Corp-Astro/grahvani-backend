import { Request, Response, NextFunction } from "express";
import { festivalClient, FestivalParams } from "../../clients/festival.client";

export class FestivalController {
  /**
   * Helper to extract common parameters from request body
   */
  private extractParams(req: Request): FestivalParams {
    return {
      year: req.body.year ? Number(req.body.year) : undefined,
      date: req.body.date,
      month: req.body.month ? Number(req.body.month) : undefined,
      latitude: req.body.latitude ? Number(req.body.latitude) : undefined,
      longitude: req.body.longitude ? Number(req.body.longitude) : undefined,
      timezone: req.body.timezone,
      festival_id: req.body.festival_id,
      include_recurring: req.body.include_recurring,
      categories: req.body.categories,
      region: req.body.region,
      limit: req.body.limit ? Number(req.body.limit) : undefined,
    };
  }

  // 1. Full Festival Calendar
  async getCalendar(req: Request, res: Response, next: NextFunction) {
    try {
      const params = this.extractParams(req);
      if (!params.year) {
        return res.status(400).json({ success: false, error: "Year is required" });
      }
      const data = await festivalClient.getCalendar(params);
      res.json(data);
    } catch (error) {
      if ((error as any).response) {
        return res.status((error as any).response.status).json((error as any).response.data);
      }
      next(error);
    }
  }

  // 2. Festival by ID
  async getFestivalById(req: Request, res: Response, next: NextFunction) {
    try {
      const params = this.extractParams(req);
      if (!params.year || !params.festival_id) {
        return res.status(400).json({ success: false, error: "Year and festival_id are required" });
      }
      const data = await festivalClient.getFestivalById(params);
      res.json(data);
    } catch (error) {
      if ((error as any).response) {
        return res.status((error as any).response.status).json((error as any).response.data);
      }
      next(error);
    }
  }

  // 3. Festivals by Date
  async getFestivalsByDate(req: Request, res: Response, next: NextFunction) {
    try {
      const params = this.extractParams(req);
      if (!params.date) {
        return res.status(400).json({ success: false, error: "Date is required (YYYY-MM-DD)" });
      }
      const data = await festivalClient.getFestivalsByDate(params);
      res.json(data);
    } catch (error) {
      if ((error as any).response) {
        return res.status((error as any).response.status).json((error as any).response.data);
      }
      next(error);
    }
  }

  // 4. Festivals by Month
  async getFestivalsByMonth(req: Request, res: Response, next: NextFunction) {
    try {
      const params = this.extractParams(req);
      if (!params.year || !params.month) {
        return res.status(400).json({ success: false, error: "Year and month are required" });
      }
      const data = await festivalClient.getFestivalsByMonth(params);
      res.json(data);
    } catch (error) {
      if ((error as any).response) {
        return res.status((error as any).response.status).json((error as any).response.data);
      }
      next(error);
    }
  }

  // 5. Government Holidays
  async getHolidays(req: Request, res: Response, next: NextFunction) {
    try {
      const params = this.extractParams(req);
      if (!params.year) {
        return res.status(400).json({ success: false, error: "Year is required" });
      }
      const data = await festivalClient.getHolidays(params);
      res.json(data);
    } catch (error) {
      if ((error as any).response) {
        return res.status((error as any).response.status).json((error as any).response.data);
      }
      next(error);
    }
  }

  // 6. Lunar Month Mapping
  async getLunarMonths(req: Request, res: Response, next: NextFunction) {
    try {
      const params = this.extractParams(req);
      if (!params.year) {
        return res.status(400).json({ success: false, error: "Year is required" });
      }
      const data = await festivalClient.getLunarMonths(params);
      res.json(data);
    } catch (error) {
      if ((error as any).response) {
        return res.status((error as any).response.status).json((error as any).response.data);
      }
      next(error);
    }
  }

  // 7. All Ekadashis
  async getEkadashis(req: Request, res: Response, next: NextFunction) {
    try {
      const params = this.extractParams(req);
      if (!params.year) {
        return res.status(400).json({ success: false, error: "Year is required" });
      }
      const data = await festivalClient.getEkadashis(params);
      res.json(data);
    } catch (error) {
      if ((error as any).response) {
        return res.status((error as any).response.status).json((error as any).response.data);
      }
      next(error);
    }
  }

  // 8. All Sankrantis
  async getSankrantis(req: Request, res: Response, next: NextFunction) {
    try {
      const params = this.extractParams(req);
      if (!params.year) {
        return res.status(400).json({ success: false, error: "Year is required" });
      }
      const data = await festivalClient.getSankrantis(params);
      res.json(data);
    } catch (error) {
      if ((error as any).response) {
        return res.status((error as any).response.status).json((error as any).response.data);
      }
      next(error);
    }
  }

  // 9. Major Festivals
  async getMajorFestivals(req: Request, res: Response, next: NextFunction) {
    try {
      const params = this.extractParams(req);
      if (!params.year) {
        return res.status(400).json({ success: false, error: "Year is required" });
      }
      const data = await festivalClient.getMajorFestivals(params);
      res.json(data);
    } catch (error) {
      if ((error as any).response) {
        return res.status((error as any).response.status).json((error as any).response.data);
      }
      next(error);
    }
  }

  // 10. Regional Festivals
  async getRegionalFestivals(req: Request, res: Response, next: NextFunction) {
    try {
      const params = this.extractParams(req);
      if (!params.year || !params.region) {
        return res.status(400).json({ success: false, error: "Year and region are required" });
      }
      const data = await festivalClient.getRegionalFestivals(params);
      res.json(data);
    } catch (error) {
      if ((error as any).response) {
        return res.status((error as any).response.status).json((error as any).response.data);
      }
      next(error);
    }
  }

  // 11. Upcoming Festivals
  async getUpcomingFestivals(req: Request, res: Response, next: NextFunction) {
    try {
      const params = this.extractParams(req);
      if (!params.date) {
        return res.status(400).json({ success: false, error: "Date is required (YYYY-MM-DD)" });
      }
      const data = await festivalClient.getUpcomingFestivals(params);
      res.json(data);
    } catch (error) {
      if ((error as any).response) {
        return res.status((error as any).response.status).json((error as any).response.data);
      }
      next(error);
    }
  }

  // 12. Available Categories
  async getCategories(req: Request, res: Response, next: NextFunction) {
    try {
      const data = await festivalClient.getCategories();
      res.json(data);
    } catch (error) {
      if ((error as any).response) {
        return res.status((error as any).response.status).json((error as any).response.data);
      }
      next(error);
    }
  }

  // 13. Vrat Calendar - Consolidated fasting calendar
  async getVratCalendar(req: Request, res: Response, next: NextFunction) {
    try {
      const params = this.extractParams(req);
      if (!params.year) {
        return res.status(400).json({ success: false, error: "Year is required" });
      }
      const data = await festivalClient.getVratCalendar(params);
      res.json(data);
    } catch (error) {
      if ((error as any).response) {
        return res.status((error as any).response.status).json((error as any).response.data);
      }
      next(error);
    }
  }

  // 14. Eclipses - Solar & lunar eclipse dates (Grahan)
  async getEclipses(req: Request, res: Response, next: NextFunction) {
    try {
      const params = this.extractParams(req);
      if (!params.year) {
        return res.status(400).json({ success: false, error: "Year is required" });
      }
      const data = await festivalClient.getEclipses(params);
      res.json(data);
    } catch (error) {
      if ((error as any).response) {
        return res.status((error as any).response.status).json((error as any).response.data);
      }
      next(error);
    }
  }

  // 15. Month View - Calendar grid with daily Panchang
  async getMonthView(req: Request, res: Response, next: NextFunction) {
    try {
      const params = this.extractParams(req);
      if (!params.year || !params.month) {
        return res.status(400).json({ success: false, error: "Year and month are required" });
      }
      const data = await festivalClient.getMonthView(params);
      res.json(data);
    } catch (error) {
      if ((error as any).response) {
        return res.status((error as any).response.status).json((error as any).response.data);
      }
      next(error);
    }
  }

  // 16. Today - Home screen combined data
  async getTodayData(req: Request, res: Response, next: NextFunction) {
    try {
      const params = this.extractParams(req);
      if (!params.date) {
        return res.status(400).json({ success: false, error: "Date is required (YYYY-MM-DD)" });
      }
      const data = await festivalClient.getTodayData(params);
      res.json(data);
    } catch (error) {
      if ((error as any).response) {
        return res.status((error as any).response.status).json((error as any).response.data);
      }
      next(error);
    }
  }

  // 17. Samvatsara - 60-year Jovian cycle metadata
  async getSamvatsara(req: Request, res: Response, next: NextFunction) {
    try {
      const params = this.extractParams(req);
      if (!params.year) {
        return res.status(400).json({ success: false, error: "Year is required" });
      }
      const data = await festivalClient.getSamvatsara(params);
      res.json(data);
    } catch (error) {
      if ((error as any).response) {
        return res.status((error as any).response.status).json((error as any).response.data);
      }
      next(error);
    }
  }

  // 18. Ritu - 6 Hindu seasons with date ranges
  async getRitu(req: Request, res: Response, next: NextFunction) {
    try {
      const params = this.extractParams(req);
      if (!params.year) {
        return res.status(400).json({ success: false, error: "Year is required" });
      }
      const data = await festivalClient.getRitu(params);
      res.json(data);
    } catch (error) {
      if ((error as any).response) {
        return res.status((error as any).response.status).json((error as any).response.data);
      }
      next(error);
    }
  }

  // 19. Amrit Siddhi Yoga - Universally auspicious dates
  async getAmritSiddhiYoga(req: Request, res: Response, next: NextFunction) {
    try {
      const params = this.extractParams(req);
      if (!params.year) {
        return res.status(400).json({ success: false, error: "Year is required" });
      }
      const data = await festivalClient.getAmritSiddhiYoga(params);
      res.json(data);
    } catch (error) {
      if ((error as any).response) {
        return res.status((error as any).response.status).json((error as any).response.data);
      }
      next(error);
    }
  }

  // 20. Nakshatra Transit - Moon's daily nakshatra position
  async getNakshatraTransit(req: Request, res: Response, next: NextFunction) {
    try {
      const params = this.extractParams(req);
      if (!params.year || !params.month) {
        return res.status(400).json({ success: false, error: "Year and month are required" });
      }
      const data = await festivalClient.getNakshatraTransit(params);
      res.json(data);
    } catch (error) {
      if ((error as any).response) {
        return res.status((error as any).response.status).json((error as any).response.data);
      }
      next(error);
    }
  }

  // 21. Planetary Transit - Planet sign changes (Gochar)
  async getPlanetaryTransit(req: Request, res: Response, next: NextFunction) {
    try {
      const params = this.extractParams(req);
      if (!params.year) {
        return res.status(400).json({ success: false, error: "Year is required" });
      }
      const data = await festivalClient.getPlanetaryTransit(params);
      res.json(data);
    } catch (error) {
      if ((error as any).response) {
        return res.status((error as any).response.status).json((error as any).response.data);
      }
      next(error);
    }
  }
}

export const festivalController = new FestivalController();
