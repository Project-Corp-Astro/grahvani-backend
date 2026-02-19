console.log("Hello from debug_verify.js");
try {
  const crypto = require("crypto");
  console.log("Crypto loaded");
  const { PrismaClient } = require("../generated/prisma");
  console.log("Prisma loaded");
} catch (e) {
  console.error("Import error:", e);
}
