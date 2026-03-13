import { PrismaClient } from "../generated/prisma";
import { FeatureKey } from "@grahvani/contracts";

const prisma = new PrismaClient();

const FEATURES = [
  // Core Astrology
  {
    featureKey: FeatureKey.VEDIC_CHARTS,
    name: "Standard Vedic Charts",
    category: "Core Astrology",
    description: "Access to D1, D9 and other divisional charts.",
  },
  {
    featureKey: FeatureKey.KP_SYSTEM,
    name: "KP System (Advanced)",
    category: "Core Astrology",
    description: "Krishnamurti Paddhati Ayanamsa and modules including Star Theory and Cusps.",
  },
  {
    featureKey: FeatureKey.RAMAN_AYANAMSA,
    name: "Raman Ayanamsa",
    category: "Core Astrology",
    description: "Use B.V. Raman ayanamsa for all calculations.",
  },
  {
    featureKey: FeatureKey.LAHIRI_AYANAMSA,
    name: "Lahiri Ayanamsa",
    category: "Core Astrology",
    description: "Use Lahiri (Chitra Paksha) ayanamsa for all calculations.",
  },
  {
    featureKey: FeatureKey.YUKTESHWAR_AYANAMSA,
    name: "Yukteshwar Ayanamsa",
    category: "Core Astrology",
    description: "Use Sri Yukteshwar ayanamsa for cosmic alignments.",
  },
  {
    featureKey: FeatureKey.BHASIN_AYANAMSA,
    name: "Bhasin Ayanamsa",
    category: "Core Astrology",
    description: "Use J.N. Bhasin ayanamsa for specialized readings.",
  },
  {
    featureKey: FeatureKey.WESTERN_ASTROLOGY,
    name: "Western Astrology",
    category: "Core Astrology",
    description: "Support for Western progressed, synastry, and composite analysis.",
  },
  {
    featureKey: FeatureKey.DASHA_SYSTEMS,
    name: "Advanced Dasha Systems",
    category: "Core Astrology",
    description: "Access to Yogini, Ashtottari, and Chara dasha systems.",
  },

  // Modules
  {
    featureKey: FeatureKey.MATCHMAKING,
    name: "Matchmaking (Ashta-Kuta)",
    category: "Modules",
    description: "Comprehensive kundli matching and compatibility analysis.",
  },
  {
    featureKey: FeatureKey.MUHURTA,
    name: "Muhurta Calculation",
    category: "Modules",
    description: "Calculate auspicious timings for various events.",
  },
  {
    featureKey: FeatureKey.NUMEROLOGY,
    name: "Numerology Suite",
    category: "Modules",
    description: "Lo Shu Grid, Name Analysis, and Mobile Numerology.",
  },
  
  // Analysis
  {
    featureKey: FeatureKey.YOGA_ANALYSIS,
    name: "Yoga & Raja Yoga Analysis",
    category: "Analysis",
    description: "Detection and scoring of powerful planetary combinations.",
  },
  {
    featureKey: FeatureKey.DOSHA_ANALYSIS,
    name: "Dosha & Aristha Analysis",
    category: "Analysis",
    description: "Manglik, Kaal Sarp, and other critical dosha checks.",
  },
  {
    featureKey: FeatureKey.CHART_PREDICTIONS,
    name: "Automated Interpretations",
    category: "Analysis",
    description: "Textual predictions for planets, houses, and dashas.",
  },

  // Power Tools
  {
    featureKey: FeatureKey.PDF_EXPORT,
    name: "Premium PDF Export",
    category: "Power Tools",
    description: "Generate and download branded PDF reports.",
  },
  {
    featureKey: FeatureKey.REPORT_EXPORT,
    name: "JSON/CSV Data Export",
    category: "Power Tools",
    description: "Export raw data for external integration.",
  },
  {
    featureKey: FeatureKey.EMAIL_DELIVERY,
    name: "Direct Email Delivery",
    category: "Power Tools",
    description: "Email reports directly to clients from the portal.",
  },

  // Platform
  {
    featureKey: FeatureKey.WHITE_LABEL,
    name: "White Label Branding",
    category: "Platform",
    description: "Remove Grahvani branding and use custom letterheads.",
  },
  {
    featureKey: FeatureKey.API_ACCESS,
    name: "Developer API Access",
    category: "Platform",
    description: "REST API keys for external application integration.",
  },
  {
    featureKey: FeatureKey.PRIORITY_SUPPORT,
    name: "Priority Support",
    category: "Platform",
    description: "Dedicated support channel with 4-hour SLA.",
  },
];

async function seed() {
  console.log("🌱 Expanding platform feature registry...");

  for (const feature of FEATURES) {
    await prisma.platformFeature.upsert({
      where: { featureKey: feature.featureKey },
      update: {
        name: feature.name,
        category: feature.category,
        description: feature.description,
      },
      create: feature,
    });
    console.log(`  - [${feature.category}] ${feature.featureKey} synced.`);
  }

  console.log("✅ Registry expansion complete.");
}

seed()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
