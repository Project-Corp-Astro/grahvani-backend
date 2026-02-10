// @ts-nocheck
import { astroEngineClient } from "../clients/astro-engine.client";

async function debugMercury() {
  const birthData = {
    birthDate: "1990-01-01",
    birthTime: "10:00:00",
    latitude: 19.076,
    longitude: 72.877,
    timezoneOffset: 5.5,
    system: "lahiri",
  };

  const level = "mahadasha";
  // We check root (Maha) response first, as my code uses nested data from Root if available.
  // Or I check 'deep' call? Frontend calls 'deep' (which is mapped to 'prana' maybe? or just 'mahadasha'?)
  // In VimshottariDasha.tsx: fetchDashaData calls clientApi.generateDasha(..., 'deep', ...).
  // ChartService 'deep' logic -> calls `generateDeepDasha` -> calls engine with `level=mahadasha`.

  console.log("Fetching Root (Level=Mahadasha/Deep)...");
  try {
    const res = await astroEngineClient.getVimshottariDasha(
      birthData,
      "mahadasha",
    );
    const data = res.data || res;
    const mahas = data.dasha_list || data.mahadashas || [];

    const mercury = mahas.find((m) => m.planet === "Mercury");
    if (!mercury) {
      console.log("Mercury Maha not found.");
      return;
    }

    console.log(
      `Mercury Maha: ${mercury.start_date} -> ${mercury.end_date} (Dur: ${mercury.duration_years})`,
    );

    const antars = mercury.antardashas || mercury.sublevels || [];
    if (antars.length === 0) {
      console.log("No Antardashas found in Mercury.");
    } else {
      console.log(`Mercury has ${antars.length} Antardashas.`);
      const mercuryAntar = antars.find((a) => a.planet === "Mercury");
      if (mercuryAntar) {
        console.log(
          `  Mercury Antar: ${mercuryAntar.start_date} -> ${mercuryAntar.end_date} (Dur: ${mercuryAntar.duration_years})`,
        );

        // Inspect deeper
        const pratyantars =
          mercuryAntar.pratyantardashas || mercuryAntar.sublevels || [];
        if (pratyantars.length > 0) {
          console.log(`  Mercury Antar has ${pratyantars.length} Pratyantars.`);
          const mercuryPrat = pratyantars.find((p) => p.planet === "Mercury");
          if (mercuryPrat) {
            console.log(
              `    Mercury Pratyantar: ${mercuryPrat.start_date} -> ${mercuryPrat.end_date}`,
            );
          } else {
            console.log(`    Mercury Pratyantar not found in list.`);
            console.log(
              "    Pratyantar List Sample:",
              JSON.stringify(pratyantars[0]),
            );
          }
        } else {
          console.log("  No Pratyantars found nested in Antar.");
        }
      }
    }
  } catch (e) {
    console.log(e);
  }
}

debugMercury().then(() => process.exit(0));
