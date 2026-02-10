// @ts-nocheck
import { astroEngineClient } from "../clients/astro-engine.client";
import { logger } from "../config/logger";

async function inspectData() {
  console.log("Starting direct Astro Engine inspection (Bypassing DB)...");

  const birthData = {
    birthDate: "1990-01-01",
    birthTime: "10:00:00",
    latitude: 19.076,
    longitude: 72.877,
    timezoneOffset: 5.5,
    system: "lahiri", // Lowercase
  };

  try {
    console.log("\n--- Fetching Sudarshan Chakra ---");
    const sudarshan = await astroEngineClient.getSudarshanChakra(birthData);
    // console.log('Sudarshan Data:', JSON.stringify(sudarshan, null, 2));

    console.log(
      "\n--- Fetching Ashtakavarga (Bhinna - via getAshtakavarga) ---",
    );
    try {
      const bhinna = await astroEngineClient.getAshtakavarga(birthData);
      console.log("Bhinna Keys:", Object.keys(bhinna));
      console.log(
        "Bhinna Sample (Sun):",
        JSON.stringify(bhinna.sun || bhinna.Sun || {}, null, 2),
      );
      console.log("Bhinna Full Dump:", JSON.stringify(bhinna, null, 2));
    } catch (e) {
      console.log("getAshtakavarga failed:", e.message);
    }

    console.log(
      "\n--- Fetching Ashtakavarga (Sarva - via getSarvaAshtakavarga) ---",
    );
    try {
      const sarva = await astroEngineClient.getSarvaAshtakavarga(birthData);
      console.log("Sarva Keys:", Object.keys(sarva));
      console.log("Sarva Full Dump:", JSON.stringify(sarva, null, 2));
    } catch (e) {
      console.log("getSarvaAshtakavarga failed:", e.message);
    }
  } catch (error) {
    console.error("Inspection Failed:", error.message);
  }
}

inspectData();
