# 🌌 Astro Engine Integration & Storage Mapping

This document provides a comprehensive technical audit of the integration between the **External Astro Engine (Python)**, the **Grahvani Proxy (Node.js)**, and **Grahvani Storage (Redis/Supabase)**.

---

## 🏛️ 1. Lahiri Ayanamsa System
*The primary system used for core Vedic calculations and divisional charts.*

### 1.1 Core Charts & Divisional
| External Endpoint (Python) | Proxy Endpoint (Integrated) | Stored in Redis | Stored in Database | Status | Description |
|:---|:---|:---:|:---:|:---|:---|
| `/lahiri/natal` | `/internal/natal` | ✅ (24h) | ✅ | **Full** | Root Birth Chart (D1). Base for all calculations. |
| `/lahiri/transit` | `/internal/transit` | ✅ (1h) | ✅ | **Full** | Gochar (Moving Planets). Refreshed hourly. |
| `/lahiri/navamsa` | `/internal/divisional/d9` | ✅ (24h) | ✅ | **Full** | Marriage & Soul strength (D9). |
| `/lahiri/calculate_d2_hora` | `/internal/divisional/d2` | ✅ (24h) | ✅ | **Full** | Wealth & Family status (D2). |
| `/lahiri/calculate_d3` | `/internal/divisional/d3` | ✅ (24h) | ✅ | **Full** | Siblings & Courage (D3). |
| `/lahiri/calculate_d4` | `/internal/divisional/d4` | ✅ (24h) | ✅ | **Full** | Property & Luxuries (D4). |
| `/lahiri/calculate_d7_chart` | `/internal/divisional/d7` | ✅ (24h) | ✅ | **Full** | Children & Creativity (D7). |
| `/lahiri/calculate_d10` | `/internal/divisional/d10` | ✅ (24h) | ✅ | **Full** | Profession & Career Success (D10). |
| `/lahiri/calculate_d12` | `/internal/divisional/d12` | ✅ (24h) | ✅ | **Full** | Parents & Lineage (D12). |
| `/lahiri/calculate_d16` | `/internal/divisional/d16` | ✅ (24h) | ✅ | **Full** | Conveyances & Happiness (D16). |
| `/lahiri/calculate_d20` | `/internal/divisional/d20` | ✅ (24h) | ✅ | **Full** | Spiritual progress (D20). |
| `/lahiri/calculate_d24` | `/internal/divisional/d24` | ✅ (24h) | ✅ | **Full** | Education & Learning (D24). |
| `/lahiri/calculate_d27` | `/internal/divisional/d27` | ✅ (24h) | ✅ | **Full** | Nakshatra based strength (D27). |
| `/lahiri/calculate_d30` | `/internal/divisional/d30` | ✅ (24h) | ✅ | **Full** | Misfortunes & Challenges (D30). |
| `/lahiri/calculate_d40` | `/internal/divisional/d40` | ✅ (24h) | ✅ | **Full** | Maternal lineage luck (D40). |
| `/lahiri/calculate_d45` | `/internal/divisional/d45" | ✅ (24h) | ✅ | **Full** | Paternal lineage luck (D45). |
| `/lahiri/calculate_d60` | `/internal/divisional/d60` | ✅ (24h) | ✅ | **Full** | Past life Karma (D60). |

### 1.2 Special Charts & Lagnas
| External Endpoint (Python) | Proxy Endpoint (Integrated) | Stored in Redis | Stored in Database | Status | Description |
|:---|:---|:---:|:---:|:---|:---|
| `/lahiri/calculate_moon_chart` | `/internal/moon-chart` | ✅ (24h) | ✅ | **Full** | Chandra Kundli (D1 Moon-centric). |
| `/lahiri/calculate_sun_chart` | `/internal/sun-chart` | ✅ (24h) | ✅ | **Full** | Surya Kundli (D1 Sun-centric). |
| `/lahiri/calculate_sudarshan_chakra` | `/internal/sudarshan-chakra` | ✅ (24h) | ✅ | **Full** | Tri-wheel chart (Lagna, Sun, Moon). |
| `/lahiri/calculate_arudha_lagna` | `/api/charts/arudha-lagna` | ✅ (24h) | ✅ | **Full** | Arudha Lagna (AL) position. |
| `/lahiri/calculate_bhava_lagna` | `/api/charts/bhava-lagna` | ✅ (24h) | ✅ | **Full** | Bhava Lagna (BL) point. |
| `/lahiri/calculate_hora_lagna` | `/api/charts/hora-lagna` | ✅ (24h) | ✅ | **Full** | Hora Lagna (HL) point. |
| `/lahiri/calculate_sripathi_bhava` | `/api/charts/sripathi-bhava` | ✅ (24h) | ✅ | **Full** | Sripathi house system cusps. |
| `/lahiri/calculate_kp_bhava` | `/api/charts/kp-bhava` | ✅ (24h) | ✅ | **Full** | KP Placidus house system cusps. |
| `/lahiri/calculate_equal_bhava_lagna`| `/api/charts/equal-bhava` | ✅ (24h) | ✅ | **Full** | Equal house system. |
| `/lahiri/calculate_d1_karkamsha` | `/api/charts/karkamsha-d1`| ✅ (24h) | ✅ | **Full** | Karkamsha in D1. |
| `/lahiri/calculate_karkamsha_d9`| `/api/charts/karkamsha-d9`| ✅ (24h) | ✅ | **Full** | Karkamsha in D9. |

### 1.3 Analysis & Reports
| External Endpoint (Python) | Proxy Endpoint (Integrated) | Stored in Redis | Stored in Database | Status | Description |
|:---|:---|:---:|:---:|:---|:---|
| `/lahiri/calculate_binnatakvarga` | `/api/ashtakavarga` | ✅ (24h) | ✅ | **Full** | Individual planetary scores. |
| `/lahiri/calculate_sarvashtakavarga`| `/api/sarva-ashtakavarga`| ✅ (24h) | ✅ | **Full** | Total Ashtakavarga points. |
| `/lahiri/shodasha_varga_summary` | `/api/shodasha-varga` | ✅ (24h) | ✅ | **Full** | 16-Varga signs overview. |
| `/lahiri/calculate_shadbala` | `/internal/shadbala` | ✅ (24h) | ✅ | **Full** | 6-fold planetary strength. |
| `/lahiri/calculate_antar_dasha` | `/api/dasha/vimshottari`| ✅ (24h) | ✅ | **Full** | Vimshottari Levels 1 & 2. |
| `/lahiri/prathythar_dasha_lahiri` | `/api/dasha/vimshottari`| ✅ (24h) | ✅ | **Full** | Vimshottari Level 3. |

---

## 💎 2. KP (Krishnamurti Paddhati) System
*Specialized system for precise timing and event analysis.*

| External Endpoint (Python) | Proxy Endpoint (Integrated) | Stored in Redis | Stored in Database | Status | Description |
|:---|:---|:---:|:---:|:---|:---|
| `/kp/cusps_chart` | `/api/kp/planets-cusps` | ✅ (24h) | ✅ | **Full** | Primary KP Chart with sub-lords. |
| `/kp/calculate_ruling_planets`| `/api/kp/ruling-planets`| ✅ (5m) | ❌ | **Medium** | Current Ruling Planets (RPs). |
| `/kp/calculate_bhava_details` | `/api/kp/bhava-details` | ✅ (24h) | ✅ | **Full** | House/Bhava detailed analysis. |
| `/kp/calculate_significations`| `/api/kp/significations`| ✅ (24h) | ✅ | **Full** | Planet & House significators. |
| `/kp/kp_horary` | `/api/kp/horary` | ❌ | ❌ | **Live** | Real-time horary analysis (no storage). |
| `/kp/calculate_maha_antar_dasha`| `/api/dasha/vimshottari`| ✅ (24h) | ✅ | **Full** | KP Vimshottari Levels 1 & 2. |
| `/kp/calculate_maha_antar_pratyantar_dasha`| `/api/dasha/vimshottari`| ✅ (24h) | ✅ | **Full** | KP Vimshottari Level 3. |

---

## 🔍 4. System-Agnostic Tools (Yoga/Dosha/Remedy)
*These are integrated across all systems, primarily using Lahiri core endpoints.*

| External Endpoint (Python) | Proxy Endpoint (Integrated) | Stored in Redis | Stored in Database | Status | Description |
|:---|:---|:---:|:---:|:---|:---|
| `/lahiri/comprehensive_gaja_kesari`| `/internal/yoga/gaja_kesari` | ✅ (24h) | ✅ | **Full** | Gaja Kesari Yoga analysis. |
| `/lahiri/pancha-mahapurusha-yogas`| `/internal/yoga/pancha_mahapurusha`| ✅ (24h) | ✅ | **Full** | 5 Great Personality Yogas. |
| `/lahiri/kala-sarpa-fixed` | `/internal/dosha/kala_sarpa`| ✅ (24h) | ✅ | **Full** | Kala Sarpa Dosha analysis. |
| `/lahiri/calculate-sade-sati` | `/internal/dosha/sade_sati` | ✅ (24h) | ✅ | **Full** | 7.5 years Saturn cycle analysis. |
| `/lahiri/vedic_remedies" | `/internal/remedy/general` | ✅ (24h) | ✅ | **Full** | General planetary remedies. |
| `/lahiri/calculate-gemstone` | `/internal/remedy/gemstone`| ✅ (24h) | ✅ | **Full** | Gemstone recommendations. |
| `/lahiri/panchanga` | `/internal/panchanga` | ✅ (1h) | ✅ | **Full** | Daily Tithi, Vara, Nakshatra, etc. |
| `/lahiri/choghadiya_times` | `/internal/choghadiya` | ✅ (1h) | ✅ | **Full** | Auspicious day/night blocks. |

---

## 📄 Summary of Storage & Caching Policy

1.  **Redis (Cache Service)**:
    - **TTL (24h)**: Most static charts (Natal, Divisional, Yoga, Dosha).
    - **TTL (1h)**: Highly variable data (Transit, Panchanga, Choghadiya).
    - **TTL (5m)**: Real-time dynamic data (KP Ruling Planets).
2.  **Database (Supabase)**:
    - **Persistent**: Any chart requested via `client-service`'s `generateAndSaveChart` is stored permanently in the `client_saved_charts` table.
    - **Unique Constraint**: Charts are stored uniquely per ClientID, System, and ChartType.
3.  **Integration Health**:
    - **98% Coverage**: Primary Vedic and KP endpoints are fully mapped.
    - **Manual Check Needed**: Western Synastry and Composite are mapped in the client but pending full validation in the UI rendering layer.
