# 🚶 Astro Engine Integration Walkthrough

This document explains the data flow from the external Python Astro Engine through the Node.js Proxy to Grahvani's storage layers.

## 🔄 The Data Flow Architecture

1.  **Request Initiation**: Client Service (or Frontend) requests a chart (e.g., Transit or D1).
2.  **Proxy Routing**: The `astro-engine` proxy service receives the request and decides which external endpoint to call (Lahiri, KP, or Raman).
3.  **Redis Check (Caching)**: Before calling the external API, the proxy checks Redis. If a fresh calculation exists, it returns it instantly.
4.  **External Computation**: If not in Redis, the Proxy calls the **External Python Astro Engine**.
5.  **Database Persistence**: Once the data is received, the `client-service` saves the result to the **Supabase PostgreSQL database** for permanent storage.

---

## 📊 Integration Mapping Summary
*This table summarizes the data flow and storage for the main modules.*

| Module | Proxy Endpoint | Storage | Caching Type | Description |
|:---|:---|:---|:---|:---|
| **Charts** | `/charts/natal` | Database & Redis | Permanent / 24h | Primary Natal (D1) chart used across the app. |
| **Dasha** | `/dasha/*` | Database & Redis | Permanent / 24h | Hierarchical Vimshottari periods (stored in Supabase). |
| **Transit** | `/charts/transit`| Database & Redis | 1-Hour TTL | Real-time planetary positions, refreshed hourly. |
| **KP System** | `/kp/*` | Database & Redis | Permanent / 24h | Krishnamurti Paddhati specific calculations. |
| **Analysis** | `/yoga/*`, `/dosha/*` | Database & Redis | Permanent / 24h | Astrological observations and remedial measures. |
| **Muhurat** | `/panchanga/*` | Database & Redis | 1-Hour TTL | Choghadiya/Hora times (volatile storage). |

---

## 🏛️ System-by-System Endpoint Details

Below are the individual endpoint mappings for each supported system.

### 🕉️ 1. Lahiri System (Core)
| External Endpoint (Python) | Proxy Path | Redis | Database | Description |
|:---|:---|:---:|:---:|:---|
| `/lahiri/natal` | `/internal/natal` | ✅ | ✅ | Root Birth Chart (D1) |
| `/lahiri/navamsa` | `/divisional/d9` | ✅ | ✅ | Marriage Strength (D9) |
| `/lahiri/calculate_d10` | `/divisional/d10`| ✅ | ✅ | Career Status (D10) |
| `/lahiri/transit` | `/transit` | ✅ | ✅ | Daily Gochar |

### 💎 2. KP System (Krishnamurti Paddhati)
| External Endpoint (Python) | Proxy Path | Redis | Database | Description |
|:---|:---|:---:|:---:|:---|
| `/kp/cusps_chart` | `/kp/planets-cusps`| ✅ | ✅ | KP Planets & Cusps |
| `/kp/calculate_ruling_planets`| `/kp/ruling-planets`| ✅ | ❌ | Hourly Ruling Planets |
| `/kp/kp_horary` | `/kp/horary` | ❌ | ❌ | Real-time Horary Analysis |

---

## 🔍 Audit & Storage Logic

- **What is Stored in Redis?**
  - **Everything** except Horary. Every request is cached to avoid repeated external API calls within the same hour/day.
- **What is Stored in the Database?**
  - **Persistent Profiles**: Any chart that forms part of a client's "Vedic Profile" (D1, D9, Dashas, Yogas) is saved in Supabase.
  - **Dynamic Data**: Transit and Panchanga are stored with a 1-hour TTL in the DB to ensure freshness.
- **Why are some things NOT stored?**
  - **Horary**: These are context-specific questions asked once. They aren't part of the birth profile.
  - **Ruling Planets**: These change every few minutes, so storing them in the DB would create massive bloat for little value.

---

## 📡 Performance Reliability
- **Retry Mechanism**: The `astro-engine.client.ts` in `client-service` implements an exponential backoff retry (2s, 4s, 8s) if the engine is unreachable.
- **Failure Tracking**: If an endpoint fails (404/500), it's marked as "failed" in the proxy for 1 hour to prevent flooding the logs and slowing down the user experience.
