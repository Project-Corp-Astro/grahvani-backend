// @ts-nocheck
import { astroEngineClient } from "../clients/astro-engine.client";

async function debugV2() {
  const birthData = {
    birthDate: "1990-01-01",
    birthTime: "10:00:00",
    latitude: 19.076,
    longitude: 72.877,
    timezoneOffset: 5.5,
    system: "lahiri",
  };

  console.log("Fetching Level 1 (Maha)...");
  const res1 = await astroEngineClient.getVimshottariDasha(birthData, "mahadasha");
  const data1 = res1.data || {};
  const list1 = data1.dasha_list || data1.mahadashas || [];

  console.log(`Level 1 items: ${list1.length}`);
  if (list1.length > 0) {
    const m = list1[0];
    console.log(`Maha[0]: ${m.planet} (${m.start_date} - ${m.end_date})`);

    // Check for nested antardashas
    if (m.antardashas) console.log(`  Has nested antardashas: ${m.antardashas.length}`);
    if (m.sublevels) console.log(`  Has nested sublevels: ${m.sublevels.length}`); // unlikely from engine

    console.log("\nFetching Level 2 (Antar) for " + m.planet + "...");
    const res2 = await astroEngineClient.getVimshottariDasha(birthData, "antardasha", {
      mahaLord: m.planet,
    });
    const list2 =
      res2.dasha_list || (res2.data && (res2.data.dasha_list || res2.data.antardashas)) || [];

    console.log(`Level 2 items: ${list2.length}`);
    list2.forEach((a) => {
      console.log(`  Antar: ${a.planet} (${a.start_date} - ${a.end_date})`);
      if (a.start_date === m.start_date && a.end_date === m.end_date) {
        console.log("    [ERROR] Matches Maha duration EXACTLY!");
      }
    });
  }
}

debugV2().then(() => process.exit(0));
