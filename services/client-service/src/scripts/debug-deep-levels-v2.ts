// @ts-nocheck
import { astroEngineClient } from "../clients/astro-engine.client";

async function debugDeepV2() {
  const birthData = {
    birthDate: "1990-01-01",
    birthTime: "10:00:00",
    latitude: 19.076,
    longitude: 72.877,
    timezoneOffset: 5.5,
    system: "lahiri",
  };

  const context = { mahaLord: "Venus", antarLord: "Venus" };

  const variants = ["pratyantar", "pratyantardasha", "3"];

  for (const v of variants) {
    console.log(`\nTesting level='${v}'...`);
    try {
      const res = await astroEngineClient.getVimshottariDasha(
        birthData,
        v,
        context,
      );
      const data = res.data || res;

      const keys = Object.keys(data);
      console.log("  Keys:", keys);

      if (data.mahadashas) {
        // Check if deep inside
        const maha = data.mahadashas.find((m: any) => m.planet === "Venus");
        if (maha && maha.antardashas) {
          const antar = maha.antardashas.find((a: any) => a.planet === "Venus");
          console.log(
            `  Venus>Venus keys:`,
            antar ? Object.keys(antar) : "Antar not found",
          );
          if (
            antar &&
            (antar.pratyantardashas || antar.dasha_list || antar.sublevels)
          ) {
            console.log("  SUCCESS! Found Level 3 data.");
          } else {
            console.log("  Failed to find Level 3 data inside structure.");
          }
        }
      } else if (data.dasha_list) {
        console.log(
          "  Found dasha_list at root with length:",
          data.dasha_list.length,
        );
        console.log("  Sample:", JSON.stringify(data.dasha_list[0]));
      } else if (data.pratyantardashas) {
        console.log(
          "  Found pratyantardashas at root:",
          data.pratyantardashas.length,
        );
      }
    } catch (e) {
      console.log("  Error:", e.message);
    }
  }
}

debugDeepV2().then(() => process.exit(0));
