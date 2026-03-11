console.log("DEBUG: Script starting...");
require("dotenv").config({
  path: require("path").resolve(__dirname, "../../../../.env"),
});
console.log("Database URL from Env:", process.env.CLIENT_DATABASE_URL ? "FOUND" : "NOT FOUND");
const { PrismaClient } = require("../generated/prisma");
const crypto = require("crypto");

const prisma = new PrismaClient();
console.log(
  "Prisma keys:",
  Object.keys(prisma).filter((k) => !k.startsWith("_")),
);
const TEST_TENANT = "00000000-0000-0000-0000-000000000000";
const TEST_CLIENT_ID = "00000000-0000-0000-0000-000000000001"; // Valid UUID format

// Replicated extractPresence logic from YogaDoshaService
function extractPresence(data, type) {
  if (!data) return false;

  // Unwrap Astro Engine response wrapper: {data: actualData, cached: bool}
  const unwrapped =
    data.data && typeof data.data === "object" && "cached" in data ? data.data : data;

  // 0. Prioritize Standardized Proxy Flag (Added consistency)
  if (unwrapped?.yoga_present === true) return true;
  if (unwrapped?.yoga_present === false) return false;

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
        if (val === true || val === 1 || val === "true" || val === "yes") return true;
      }
    }
  }

  // 3. Recursive generic scan
  const findTruePresence = (obj, depth = 0) => {
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
        if (val === true || val === 1 || val === "true" || val === "yes") return true;
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

  const findAnyPresence = (obj, depth = 0) => {
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
        if (val === true || val === 1 || val === "true" || val === "yes") return true;
        if (val === false || val === 0 || val === "false" || val === "no") return false;
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

// Simulated Service Method
async function storeYogaDoshaScanner(tenantId, clientId, category, type, system, analysisData) {
  const isPresent = extractPresence(analysisData, type);
  console.log(`[STORE] ${category} | ${type} | isPresent: ${isPresent}`);

  // Clean data wrapper
  const storedData =
    analysisData?.data && typeof analysisData.data === "object" && "cached" in analysisData
      ? analysisData.data
      : analysisData;

  // Upsert logic simulation (direct DB call)
  await prisma.clientYogaDosha.upsert({
    where: {
      tenantId_clientId_category_type_system: {
        tenantId,
        clientId,
        category,
        type,
        system,
      },
    },
    update: { isPresent, analysisData: storedData, calculatedAt: new Date() },
    create: {
      tenantId,
      clientId,
      category,
      type,
      isPresent,
      system,
      analysisData: storedData,
      calculatedAt: new Date(),
    },
  });

  return isPresent;
}

async function main() {
  console.log("--- Starting JS Verification Logic ---");

  console.log("Creating Test Client...");

  // Check if client exists to avoid unique constraint error on retry
  let client = await prisma.client.findFirst({
    where: { id: TEST_CLIENT_ID },
  });

  if (!client) {
    client = await prisma.client.create({
      data: {
        id: TEST_CLIENT_ID,
        tenantId: TEST_TENANT, // using valid UUID var
        fullName: "Verification Client JS",
        clientCode: "VERIFY-001",
        gender: "male",
        birthDate: new Date(),
        birthTime: new Date(), // Use Date object for Prisma DateTime field
        birthLatitude: 0,
        birthLongitude: 0,
        // placeId: 'verify_js', // removed if not in schema or optional
        birthTimeKnown: true,
        // timezoneOffset is NOT in schema.
        // Let's omit optional fields to be safe.
      },
    });
    console.log(`Created Client: ${client.id}`);
  } else {
    console.log(`Using existing Client: ${client.id}`);
  }

  try {
    const testCases = [
      {
        type: "comprehensive_guru_mangal",
        category: "yoga",
        data: { overall_yoga_present: true, details: "..." },
        expected: true,
        desc: "overall_yoga_present: true",
      },
      {
        type: "comprehensive_gaja_kesari",
        category: "yoga",
        data: {
          yoga_analysis: {
            explanation: "...",
            yoga_present: false,
          },
        },
        expected: false,
        desc: "Nested yoga_analysis.yoga_present: false",
      },
      {
        type: "budha_aditya",
        category: "yoga",
        data: { yoga_present: true },
        expected: true,
        desc: "Simple yoga_present: true",
      },
      {
        type: "daridra_analysis",
        category: "yoga",
        data: { total_daridra_yogas: 4 },
        expected: true,
        desc: "total_daridra_yogas > 0",
      },
      {
        type: "no_daridra",
        category: "yoga",
        data: { total_daridra_yogas: 0 },
        expected: false,
        desc: "total_daridra_yogas == 0",
      },
      {
        type: "kala_sarpa",
        category: "dosha",
        data: { has_kala_sarpa: true },
        expected: true,
        desc: "has_kala_sarpa: true",
      },
      {
        type: "standardized_yoga",
        category: "yoga",
        data: { yoga_present: true, some_other_data: "..." },
        expected: true,
        desc: "Standardized yoga_present: true",
      },
    ];

    let passed = 0;
    let failed = 0;

    for (const test of testCases) {
      console.log(`\nTesting: ${test.type} (${test.desc})`);
      await storeYogaDoshaScanner(
        TEST_TENANT,
        client.id,
        test.category,
        test.type,
        "lahiri",
        test.data,
      );

      const record = await prisma.clientYogaDosha.findUnique({
        where: {
          tenantId_clientId_category_type_system: {
            tenantId: TEST_TENANT,
            clientId: client.id,
            category: test.category,
            type: test.type,
            system: "lahiri",
          },
        },
      });

      if (record && record.isPresent === test.expected) {
        console.log(`✅ PASSED. Stored isPresent: ${record.isPresent}`);
        passed++;
      } else {
        console.log(`❌ FAILED. Expected ${test.expected}, Got ${record?.isPresent}`);
        failed++;
      }
    }

    console.log(`\n--- Verification Summary ---`);
    console.log(`Passed: ${passed}`);
    console.log(`Failed: ${failed}`);
  } catch (e) {
    console.error("Verification Error:", e);
  } finally {
    console.log("Cleaning up...");
    try {
      // Delete yoga doshas first due to foreign key
      await prisma.clientYogaDosha.deleteMany({
        where: { clientId: client.id },
      });
      await prisma.client.delete({ where: { id: client.id } });
    } catch (e) {
      console.error("Cleanup error", e);
    }
    await prisma.$disconnect();
  }
}

main().catch(console.error);
