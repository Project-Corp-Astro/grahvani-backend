// @ts-nocheck
import { calculateSubPeriods } from "../utils/vimshottari-calc";

console.log("Testing Calculation Logic...");

const parent = {
  planet: "Venus",
  start_date: "2067-09-10T00:00:00.000Z",
  duration_years: 3.3333, // Antardasha duration
};

console.log(
  `Parent: ${parent.planet}, Start: ${parent.start_date}, Duration: ${parent.duration_years}`,
);

const subs = calculateSubPeriods(
  parent.planet,
  parent.start_date,
  parent.duration_years,
);

console.log(`Calculated ${subs.length} sub-periods:`);
subs.forEach((s) => {
  console.log(
    `  - ${s.planet}: ${s.start_date} -> ${s.end_date} (dur: ${s.duration_years.toFixed(4)})`,
  );
});

// Check dates
if (subs[0].start_date === parent.start_date) {
  console.log("[OK] First child starts with parent.");
}
if (subs[8].end_date > "2071-01-08") {
  // 2067 + 3.33 y -> ~2071.
  console.log("[OK] End date seems roughly correct.");
}
