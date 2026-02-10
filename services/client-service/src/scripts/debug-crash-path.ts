// @ts-nocheck
import { astroEngineClient } from "../clients/astro-engine.client";
import { calculateSubPeriods } from "../utils/vimshottari-calc";

async function debugCrashPath() {
  const birthData = {
    birthDate: "1990-01-01",
    birthTime: "10:00:00",
    latitude: 19.076,
    longitude: 72.877,
    timezoneOffset: 5.5,
    system: "lahiri",
  };

  // Path: Saturn > Saturn > Mercury > Ketu
  // Requesting Next Level: Prana
  const level = "prana";
  const context = {
    mahaLord: "Saturn",
    antarLord: "Saturn",
    pratyantarLord: "Mercury",
    sookshmaLord: "Ketu",
  };

  console.log(`Checking path: ${JSON.stringify(context)}`);

  try {
    // 1. Fetch from Engine
    const res = await astroEngineClient.getVimshottariDasha(
      birthData,
      level,
      context,
    );
    const data = res.data || res;
    const rootList = data.dasha_list || data.mahadashas || [];

    console.log(`Engine returned root list size: ${rootList.length}`);

    // 2. Simulate Service Traversal
    let currentNodes = rootList;
    let lastParent = null;
    let finalList = rootList;

    const contextLords = [
      context.mahaLord,
      context.antarLord,
      context.pratyantarLord,
      context.sookshmaLord,
    ];

    for (const lord of contextLords) {
      console.log(`Looking for ${lord}...`);
      const node = currentNodes.find((n: any) => n.planet === lord);
      if (node) {
        lastParent = node;
        console.log(
          `Found ${lord}. Children available?`,
          !!node.sublevels || !!node.antardashas,
        );

        const nextLevel =
          node.sublevels ||
          node.antardashas ||
          node.pratyantardashas ||
          node.sookshmadashas ||
          node.pranadashas;
        if (nextLevel && Array.isArray(nextLevel) && nextLevel.length > 0) {
          currentNodes = nextLevel;
          finalList = currentNodes;
        } else {
          console.log("No children found.");
          finalList = [];
          break;
        }
      } else {
        console.log(`${lord} NOT FOUND.`);
        finalList = [];
        break;
      }
    }

    console.log("Final List from Engine Traversal:", finalList.length);

    // 3. Simulate Calculation Fallback
    if (finalList.length === 0 && lastParent) {
      console.log("Triggering Fallback Calculation...");
      console.log(
        `Parent: ${lastParent.planet}, Start: ${lastParent.start_date}, Dur: ${lastParent.duration_years}`,
      );
      if (!lastParent.start_date)
        console.error("CRITICAL: Parent has no start_date!");

      finalList = calculateSubPeriods(
        lastParent.planet,
        lastParent.start_date,
        lastParent.duration_years,
        lastParent.end_date,
      );
      console.log(`Calculated ${finalList.length} items.`);
      console.log("First Item:", finalList[0]);
    }
  } catch (e) {
    console.error("Error:", e);
  }
}

debugCrashPath().then(() => process.exit(0));
