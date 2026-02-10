import axios from "axios";

const ASTRO_URL =
  process.env.ASTRO_ENGINE_EXTERNAL_URL || "https://astroengine.astrocorp.in";

const payload = {
  user_name: "Verification Script",
  birth_date: "1990-08-15",
  birth_time: "10:30:00",
  latitude: "28.6139",
  longitude: "77.2090",
  timezone_offset: 5.5,
  system: "lahiri",
};

async function verify() {
  console.log(`Checking Astro Engine at: ${ASTRO_URL}`);

  try {
    console.log("---- Fetching ASHTOTTARI (Antar) ----");
    // Check standard endpoint
    const t1 = await axios.post(
      `${ASTRO_URL}/lahiri/calculate_ashtottari_antar`,
      payload,
    );
    console.log("Status:", t1.status);
    const keys1 = Object.keys(t1.data);
    console.log("Keys:", keys1);

    // Check for periods
    const periods1 =
      t1.data.tribhagi_dashas_janma ||
      t1.data.mahadashas ||
      t1.data.ashtottari_dasha ||
      t1.data.ashtottari_antar ||
      [];
    if (periods1.length > 0) {
      console.log(
        "First Period (Ashtottari Antar):",
        JSON.stringify(periods1[0], null, 2),
      );
      // Check depth
      if (periods1[0].antardashas || periods1[0].sublevels) {
        console.log("\n[INFO] Nested Antardashas FOUND.");
      } else {
        console.log("\n[INFO] Nested Antardashas NOT found.");
      }
    } else {
      console.log("Sample Data:", JSON.stringify(t1.data).substring(0, 500));
    }

    console.log("\n---- Fetching ASHTOTTARI (Pratyantar) ----");
    // Try to fetch Pratyantar - assuming it might need maha/antar context or returns full tree if no context?
    // Let's try sending generic payload first.
    try {
      const t2 = await axios.post(
        `${ASTRO_URL}/lahiri/calculate_ashtottari_prathyantar`,
        {
          ...payload,
          maha_lord: "Venus", // Sample lords from previous output
          antar_lord: "Venus",
        },
      );
      console.log("Status (Pratyantar):", t2.status);
      console.log("TOP-LEVEL KEYS:", Object.keys(t2.data));

      // Check if there is any key that looks like a list
      for (const key of Object.keys(t2.data)) {
        if (Array.isArray(t2.data[key])) {
          console.log(
            `Key '${key}' is an array of length ${t2.data[key].length}`,
          );
        }
      }

      const periods2 =
        t2.data.mahadashas ||
        t2.data.ashtottari_dasha ||
        t2.data.ashtottari_antar ||
        t2.data.ashtottari_pratyantardasha ||
        [];
      if (periods2.length > 0) {
        const p1 = periods2[0];
        console.log("First Maha:", p1.lord);
        console.log("First Maha Keys:", Object.keys(p1));

        if (p1.antardashas) {
          console.log("  Antar count:", p1.antardashas.length);
          const a1 = p1.antardashas[0];
          console.log("  First Antar Keys:", Object.keys(a1));

          // Look for ANY nested array in first Antar
          for (const subKey of Object.keys(a1)) {
            if (Array.isArray(a1[subKey])) {
              console.log(
                `    FOUND NESTED ARRAY in Antar: '${subKey}' (length ${a1[subKey].length})`,
              );
            }
          }

          if (a1.pratyantardashas || a1.sublevels || a1.periods) {
            const level3 = a1.pratyantardashas || a1.sublevels || a1.periods;
            console.log("    [SUCCESS] Found Level 3 count:", level3.length);
          }
        }
      }
    } catch (e: any) {
      console.log("Pratyantar Endpoint Error:", e.message, e.response?.data);
    }
  } catch (error: any) {
    console.error("Error:", error.message);
    if (error.response) {
      console.error("Data:", error.response.data);
    }
  }
}

verify();
