import axios from "axios";

const ENGINE_URL = "https://astroengine.astrocorp.in";

const birthData = {
  birth_date: "1990-08-15",
  birth_time: "10:30:00",
  latitude: "28.6139",
  longitude: "77.2090",
  timezone_offset: 5.5,
  system: "lahiri",
};

async function verifyVimshottari() {
  console.log(`Checking Vimshottari at: ${ENGINE_URL}`);

  try {
    console.log("\n---- Fetching VIMSHOTTARI (Pratyantar) with Lords (Ven, Ven) ----");
    const response = await axios.post(`${ENGINE_URL}/lahiri/calculate_vimshottari_prathyantar`, {
      ...birthData,
      maha_lord: "Venus",
      antar_lord: "Venus",
    });

    console.log("Status:", response.status);

    // Deep log the first periods to see structure
    const periods = response.data.mahadashas || [];
    if (periods.length > 0) {
      const m1 = periods[0];
      console.log("First Maha:", m1.lord);
      if (m1.antardashas && m1.antardashas.length > 0) {
        const a1 = m1.antardashas[0];
        console.log("  First Antar:", a1.lord);
        console.log("  First Antar Keys:", Object.keys(a1));
        if (a1.pratyantardashas) {
          console.log("    [SUCCESS] Found Pratyantardashas:", a1.pratyantardashas.length);
          console.log("    First Pratyantar:", JSON.stringify(a1.pratyantardashas[0]));
        } else {
          console.log("    [FAIL] No pratyantardashas found.");
        }
      }
    }
  } catch (error: any) {
    console.error("Error:", error.message, error.response?.data);
  }
}

verifyVimshottari();
