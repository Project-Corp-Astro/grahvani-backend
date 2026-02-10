import { LahiriClient } from "../clients/lahiri.client";
import { BirthData } from "../types";
import { logger } from "../config/logger";

async function verifyLahiriEndpoints() {
  const client = new LahiriClient();

  const birthData: BirthData = {
    userName: "Test User",
    birthDate: "1990-01-01",
    birthTime: "12:00:00",
    latitude: 28.6139,
    longitude: 77.209,
    timezoneOffset: 5.5,
    ayanamsa: "lahiri",
  };

  console.log("--- Verifying Lahiri Endpoints ---");

  try {
    console.log("1. Testing Bhinna Ashtakavarga...");
    const bhinna = await client.getBhinnaAshtakavarga(birthData);
    console.log("✓ Bhinna Ashtakavarga Success:", !!bhinna);

    console.log("2. Testing Sarva Ashtakavarga...");
    const sarva = await client.getSarvaAshtakavarga(birthData);
    console.log("✓ Sarva Ashtakavarga Success:", !!sarva);

    console.log("3. Testing Shodasha Varga Summary...");
    const shodasha = await client.getShodashaVarga(birthData);
    console.log("✓ Shodasha Varga Summary Success:", !!shodasha);

    console.log("4. Testing Antar Dasha...");
    const antar = await client.getAntarDasha(birthData);
    console.log("✓ Antar Dasha Success:", !!antar);

    console.log("\n--- Final Result: ALL LAHIRI ENDPOINTS ACCESSIBLE ---");
  } catch (error: any) {
    console.error("✖ Verification failed:");
    if (error.response) {
      console.error(`Status: ${error.response.status}`);
      console.error("Data:", JSON.stringify(error.response.data, null, 2));
    } else {
      console.error(error.message);
    }
    process.exit(1);
  }
}

verifyLahiriEndpoints();
