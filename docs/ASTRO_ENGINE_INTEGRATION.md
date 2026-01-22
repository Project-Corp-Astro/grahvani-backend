# Astro Engine Core-to-Proxy Integration Mapping: Lahiri System

*This document provides a verified mapping of the Lahiri Ayanamsa system, documenting the data flow from the External Astro Engine (Python) through the Proxy (Node.js) to Grahvani Storage (Redis/Supabase).*

---

## 🕉️ Lahiri System: Core Endpoints & Integration Status
*Verified against `Astro_Engine/app.py` and `grahvani-backend/.../astro-client.ts`.*

| Core Endpoint (Python) | Proxy Alias (Node.js) | Redis (Cache) | Database (Supabase) | Status | Technical Note |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `/lahiri/natal` | `/internal/natal` | ✅ (24h) | ✅ | **Full** | Root Birth Chart (D1). Base for all calculations. |
| `/lahiri/transit` | `/internal/transit` | ✅ (1h) | ✅ | **Full** | Gochar (Moving Planets). Stored with TTL in DB. |
| `/lahiri/navamsa` | `/internal/divisional/D9` | ✅ (24h) | ✅ | **Full** | Marriage & Soul strength. Verified in `chart.service`. |
| `/lahiri/calculate_d2_hora` | `/internal/divisional/D2` | ✅ | ✅ | **Full** | Wealth & Family status. |
| `/lahiri/calculate_d3` | `/internal/divisional/D3` | ✅ (24h) | ✅ | **Full** | Siblings & Courage. |
| `/lahiri/calculate_d4` | `/internal/divisional/D4` | ✅ | ✅ | **Full** | Property & Luxuries. |
| `/lahiri/calculate_d7_chart` | `/internal/divisional/D7` | ✅ | ✅ | **Full** | Children & Creativity. |
| `/lahiri/calculate_d10` | `/internal/divisional/D10` | ✅ | ✅ | **Full** | Profession & Career Success. |
| `/lahiri/calculate_d12` | `/internal/divisional/D12` | ✅ | ✅ | **Full** | Parents & Lineage. |
| `/lahiri/calculate_d16` | `/internal/divisional/D16` | ✅ | ✅ | **Full** | Conveyances & Happiness. |
| `/lahiri/calculate_d20` | `/internal/divisional/D20` | ✅ | ✅ | **Full** | Spiritual progress. |
| `/lahiri/calculate_d24` | `/internal/divisional/D24` | ✅ | ✅ | **Full** | Education & Learning. |
| `/lahiri/calculate_d27` | `/internal/divisional/D27` | ✅ | ✅ | **Full** | General strength analysis. |
| `/lahiri/calculate_d30` | `/internal/divisional/D30` | ✅ | ✅ | **Full** | Misfortunes & Challenges. |
| `/lahiri/calculate_d40` | `/internal/divisional/D40` | ✅ | ✅ | **Full** | Maternal lineage luck. |
| `/lahiri/calculate_d45` | `/internal/divisional/D45` | ✅ | ✅ | **Full** | Paternal lineage luck. |
| `/lahiri/calculate_d60` | `/internal/divisional/D60` | ✅ | ✅ | **Full** | Past life Karma. |
| `/lahiri/d150-nadiamsha` | `/internal/divisional/D150` | ✅ | ✅ | **Full** | Micro-destiny points. |

---

## ⏳ Dasha System Integration (Lahiri)
*Verified for multi-level forecasting.*

| Core Endpoint (Python) | Proxy Endpoint (Integrated) | Redis | Database | Status | Description |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `/lahiri/calculate_antar_dasha` | `/internal/dasha/vims` | ✅ | ✅ | **Full** | Vimshottari Levels 1 & 2. |
| `/lahiri/prathythar_dasha_lahiri`| `/internal/dasha/vims` | ✅ | ✅ | **Full** | Vimshottari Level 3. |
| `/lahiri/calculate_antar_pratyantar_sookshma_dasha`| `/internal/dasha/vims` | ✅ | ✅ | **Full** | Vimshottari Level 4. |
| `/lahiri/calculate_sookshma_prana_dashas`| `/internal/dasha/prana` | ✅ | ✅ | **Full** | Vimshottari Level 5. |
| `/lahiri/calculate_tribhagi_dasha`| `/internal/dasha/other` | ✅ | ✅ | **Full** | Specialty Triple Cycle Dasha. |

---

## 📊 Ashtakavarga & Strength Tools
*Vedic scoring and planetary power matrix.*

| Core Endpoint (Python) | Proxy Endpoint (Integrated) | Redis | Database | Status | Description |
| :--- | :--- | :---: | :---: | :---: | :--- |
| `/lahiri/calculate_binnatakvarga` | `/internal/ashtakavarga` | ✅ | ✅ | **Full** | Bhinna Ashtakavarga (Individual). |
| `/lahiri/calculate_sarvashtakavarga`| `/internal/sarva-ashta`| ✅ | ✅ | **Full** | Sarva Ashtakavarga (Total). |
| `/lahiri/shodasha_varga_summary` | `/internal/shodasha-varga`| ✅ | ✅ | **Full** | 16-Varga Comparative Table. |
| `/lahiri/calculate_shadbala` | `/internal/shadbala` | ✅ | ✅ | **Full** | 6-fold planetary strength. |

---

## 🛠️ Infrastructure Audit (Lahiri)

### 1. Redis Caching Flow
- **Layer 1 (Core)**: Python `Astro_Engine` uses `@cache_calculation` decorators with Redis to cache expensive Swisseph calculations. TTL varies from 1h (Transit) to 24h (Charts).
- **Layer 2 (Proxy)**: Node.js `Astro-Engine Proxy` uses `cacheService` middleware to cache raw JSON responses from the core, reducing inter-service latency.

### 2. Database Persistence
- **Grahvani Client Service**: Verified that `generateFullVedicProfile` (line 335, `chart.service.ts`) executes batched operations to pull and save every single Lahiri chart listed above into the **Supabase (PostgreSQL)** database for permanent storage.
- **Trigger**: Persistence occurs automatically during initial profile generation or via `ensureFullVedicProfile` routine.

### 3. Integration Integrity
- **Proxy Success**: 100% of primary Lahiri charts are successfully mapped in the proxy client.
- **Next Steps**: Dasha Reports (1-year, Weekly, Daily) found in core are currently **Pending Proxy Exposure**.

> [!IMPORTANT]
> **Synastry & Composite Alert**: Core endpoints for relationship charts are located at `/western/*` namespace, but proxy currently references `/lahiri/*`. This requires an endpoint update in the proxy client service.
