// @ts-nocheck
import { astroEngineClient } from "../clients/astro-engine.client";

async function inspectPrana() {
  console.log("Inspecting Prana/Sookshma Dasha...");

  const birthData = {
    birthDate: "1990-01-01",
    birthTime: "10:00:00",
    latitude: 19.076,
    longitude: 72.877,
    timezoneOffset: 5.5,
    system: "lahiri",
  };

  try {
    console.log("\n--- Fetching Sookshma (via getVimshottariDasha) ---");
    // Need context: Maha=Venus, Antar=Moon, Pratyantar=Mars
    const sookshma = await astroEngineClient.getVimshottariDasha(birthData, "sookshma", {
      mahaLord: "Venus",
      antarLord: "Moon",
      pratyantarLord: "Mars",
    });
    console.log("Sookshma Sample:", JSON.stringify(sookshma, null, 2));
  } catch (e) {
    console.log("getVimshottariDasha(sookshma) failed:", e.message);
  }

  try {
    console.log("\n--- Fetching Prana (via getVimshottariDasha with sookshmaLord) ---");
    const prana = await astroEngineClient.getVimshottariDasha(birthData, "prana", {
      mahaLord: "Venus",
      antarLord: "Moon",
      pratyantarLord: "Mars",
      sookshmaLord: "Rahu",
    });
    console.log("Prana Sample:", JSON.stringify(prana, null, 2));
  } catch (e) {
    console.log("getVimshottariDasha(prana) failed:", e.message);
    if (e.response) console.log("Err Data:", e.response.data);
  }

  try {
    console.log("\n--- Fetching Prana (via getPranaDasha) ---");
    const prana2 = await astroEngineClient.getPranaDasha(birthData);
    console.log("getPranaDasha Result:", JSON.stringify(prana2, null, 2));
  } catch (e) {
    console.log("getPranaDasha failed:", e.message);
  }
}

inspectPrana();
