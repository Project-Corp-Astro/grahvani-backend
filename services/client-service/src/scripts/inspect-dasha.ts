// @ts-nocheck
import { astroEngineClient } from "../clients/astro-engine.client";
import { logger } from "../config/logger";

async function inspectDasha() {
  console.log("Starting Dasha Inspection...");

  const birthData = {
    birthDate: "1990-01-01",
    birthTime: "10:00:00",
    latitude: 19.076,
    longitude: 72.877,
    timezoneOffset: 5.5,
    system: "lahiri",
  };

  try {
    console.log("\n--- Fetching Mahadasha Level ---");
    const maha = await astroEngineClient.getVimshottariDasha(birthData, "mahadasha");
    console.log("Maha Keys:", Object.keys(maha));
    console.log("Maha Sample:", JSON.stringify(maha, null, 2));

    // Assuming Maha returns a list, let's pick the first one and ask for Antar
    // Need to see the structure first.

    // Also check "Antardasha" call
    console.log("\n--- Fetching Antardasha Level (Test) ---");
    // Usually requires a lord context?
    // Let's try sending just birthdata + level as per existing signature
    try {
      // The signature in astro-engine.client.ts: (birthData, level, context)
      const antar = await astroEngineClient.getVimshottariDasha(birthData, "antardasha", {
        mahaLord: "Venus", // hypothetical context
      });
      console.log("Antar Sample:", JSON.stringify(antar, null, 2));
    } catch (e) {
      console.log("Antar fetch failed:", e.message);
    }
  } catch (error) {
    console.error("Inspection Failed:", error.message);
    if (error.response) {
      console.log("Data:", error.response.data);
    }
  }
}

inspectDasha();
