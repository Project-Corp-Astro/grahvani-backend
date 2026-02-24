// @ts-nocheck
import { astroEngineClient } from "../clients/astro-engine.client";

async function debugPrana() {
  const birthData = {
    birthDate: "1990-01-01",
    birthTime: "10:00:00",
    latitude: 19.076,
    longitude: 72.877,
    timezoneOffset: 5.5,
    system: "lahiri",
  };

  // Path: Venus > Venus > Venus > Venus > (Prana)
  const context = {
    mahaLord: "Venus",
    antarLord: "Venus",
    pratyantarLord: "Venus",
    sookshmaLord: "Venus",
  };

  console.log("Fetching Prana (Level 5)...");
  try {
    const res = await astroEngineClient.getVimshottariDasha(birthData, "prana", context);
    const data = res.data || res;

    console.log("Keys:", Object.keys(data));

    if (data.mahadashas) console.log("Has mahadashas root.");
    if (data.dasha_list) console.log("Has dasha_list root.");

    // Dump first item of whatever list
    const list = data.dasha_list || data.mahadashas || [];
    if (list.length > 0) {
      console.log("Item 0 Planet:", list[0].planet);
      console.log("Item 0 Start:", list[0].start_date);
      console.log("Item 0 End:", list[0].end_date);

      // Check if matches Venus Maha dates (1990-2010 approx)
      if (list[0].start_date?.startsWith("2067") || list[0].start_date?.includes("1990")) {
        // If standard Venus cycle is 20y, starting 1990?
        // Wait, random user.
        console.log("Duration:", list[0].duration_years);
      }
    }
  } catch (e) {
    console.log(e.message);
  }
}

debugPrana().then(() => process.exit(0));
