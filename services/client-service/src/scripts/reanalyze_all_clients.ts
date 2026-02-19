import { PrismaClient } from "../generated/prisma";

const prisma = new PrismaClient();

// Copied and refined logic from YogaDoshaService to ensure script independence
function extractPresence(data: any, type?: string): boolean {
  if (!data) return false;

  // Unwrap Astro Engine response wrapper: {data: actualData, cached: bool}
  const unwrapped =
    data.data && typeof data.data === "object" && "cached" in data
      ? data.data
      : data;

  // 1. Try Specific Known Patterns (Based on analysis)
  // Handle "overall_yoga_present" (e.g. guru_mangal)
  if (unwrapped?.overall_yoga_present === true) return true;
  if (unwrapped?.overall_yoga_present === false) return false;

  // Handle "total_daridra_yogas" (count based presence)
  if (typeof unwrapped?.total_daridra_yogas === "number") {
    return unwrapped.total_daridra_yogas > 0;
  }

  // Handle nested "yoga_analysis" object (e.g. gaja_kesari)
  if (unwrapped?.yoga_analysis && typeof unwrapped.yoga_analysis === "object") {
    if (unwrapped.yoga_analysis.yoga_present === true) return true;
    if (unwrapped.yoga_analysis.yoga_present === false) return false;
  }

  // 2. Try Specific Type Keys (if type provided)
  if (type) {
    const normalizedType = type.toLowerCase().replace(/-/g, "_");
    const specificKeys = [
      `${normalizedType}_present`,
      `has_${normalizedType}`,
      `${normalizedType}_active`,
      `is_${normalizedType}`,
      normalizedType, // sometimes the key is just the name with a boolean value
    ];

    for (const key of specificKeys) {
      if (key in unwrapped) {
        const val = unwrapped[key];
        if (val === true || val === 1 || val === "true" || val === "yes")
          return true;
      }
    }
  }

  // 3. Recursive generic scan
  const findTruePresence = (obj: any, depth = 0): true | undefined => {
    if (!obj || typeof obj !== "object" || depth > 4) return undefined;

    const keys = Object.keys(obj);

    // Generic presence indicators
    for (const key of keys) {
      const val = obj[key];
      const lowerKey = key.toLowerCase();

      const isPresenceKey =
        lowerKey.endsWith("_present") ||
        lowerKey.startsWith("has_") ||
        lowerKey.endsWith("_active") ||
        lowerKey === "present" ||
        lowerKey === "is_present" ||
        lowerKey === "status";

      if (isPresenceKey) {
        if (val === true || val === 1 || val === "true" || val === "yes")
          return true;
      }
    }

    // Recurse
    for (const key of keys) {
      const val = obj[key];
      if (typeof val === "object" && val !== null && !Array.isArray(val)) {
        if (findTruePresence(val, depth + 1)) return true;
      }
    }

    return undefined;
  };

  const findAnyPresence = (obj: any, depth = 0): boolean | undefined => {
    if (!obj || typeof obj !== "object" || depth > 4) return undefined;

    const keys = Object.keys(obj);
    for (const key of keys) {
      const val = obj[key];
      const lowerKey = key.toLowerCase();

      if (
        lowerKey.endsWith("_present") ||
        lowerKey.startsWith("has_") ||
        lowerKey.endsWith("_active") ||
        lowerKey === "present" ||
        lowerKey === "is_present" ||
        lowerKey === "status"
      ) {
        if (val === true || val === 1 || val === "true" || val === "yes")
          return true;
        if (val === false || val === 0 || val === "false" || val === "no")
          return false;
      }
    }

    for (const key of keys) {
      const val = obj[key];
      if (typeof val === "object" && val !== null && !Array.isArray(val)) {
        const res = findAnyPresence(val, depth + 1);
        if (res !== undefined) return res;
      }
    }

    return undefined;
  };

  if (findTruePresence(unwrapped)) return true;
  return findAnyPresence(unwrapped) ?? false;
}

async function main() {
  console.log(
    "Starting [Self-Contained] re-analysis of all ClientYogaDosha records...",
  );

  const allRecords = await prisma.clientYogaDosha.findMany();
  console.log(`Found ${allRecords.length} total records.`);

  let updatedCount = 0;
  let correctCount = 0;

  for (const record of allRecords) {
    const newIsPresent = extractPresence(record.analysisData, record.type);

    if (newIsPresent !== record.isPresent) {
      console.log(
        `[UPDATE] ${record.clientId} | ${record.type} | Old: ${record.isPresent} -> New: ${newIsPresent}`,
      );

      await prisma.clientYogaDosha.update({
        where: { id: record.id },
        data: { isPresent: newIsPresent },
      });
      updatedCount++;
    } else {
      correctCount++;
    }
  }

  console.log("\n--- Re-analysis Complete ---");
  console.log(`Detailed Report:`);
  console.log(`Total Records Scanned: ${allRecords.length}`);
  console.log(`Records Updated: ${updatedCount}`);
  console.log(`Records Initially Correct: ${correctCount}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
    process.exit(0);
  });
