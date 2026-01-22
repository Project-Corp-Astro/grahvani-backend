# Dasha Systems Implementation Guide

## Overview

This document explains the complete implementation of alternative Dasha systems (non-Vimshottari) in the Grahvani backend. The API now supports all major Vedic Dasha systems including Tribhagi, Shodashottari, Dwadashottari, and more.

## Supported Dasha Systems

The following Vedic Dasha systems are now fully integrated:

| System | Route Parameter | Duration | Astro Engine Endpoint | Use Case |
|--------|-----------------|----------|----------------------|----------|
| Tribhagi | `tribhagi` | 120 years | `/lahiri/calculate_tribhagi_dasha` | Three-fold system |
| Tribhagi 40 | `tribhagi-40` | 40 years | `/lahiri/tribhagi-dasha-40` | Condensed version |
| Shodashottari | `shodashottari` | 120 years | `/lahiri/shodashottari-dasha` | 16-sign system |
| Dwadashottari | `dwadashottari` | 120 years | `/lahiri/dwadashottari-dasha` | 12-sign system |
| Panchottari | `panchottari` | 100 years | `/lahiri/calculate-panchottari-dasha` | 5-sign system |
| Shattrimshatsama | `shattrimshatsama` | 36 years | `/lahiri/calculate_Shattrimshatsama_dasha` | 36-year cycle |
| Chaturshitisama | `chaturshitisama` | 84 years | `/lahiri/calculate_Chaturshitisama_dasha` | 84-year cycle |
| Shastihayani | `shastihayani` | 60 years | `/lahiri/calculate_Shastihayani_dasha` | 60-year cycle |
| Satabdika | `satabdika` | 100 years | `/lahiri/calculate_Satabdika_dasha` | 100-year cycle |
| Dwisaptati | `dwisaptati` | 72 years | `/lahiri/calculate_Dwisaptati_dasha` | 72-year cycle |
| Other | `other` | System specific | Uses Tribhagi as default | Fallback system |

## API Endpoints

### 1. Vimshottari Dasha (Default Dasha System)

```http
POST /api/v1/clients/:clientId/dasha
Content-Type: application/json
Authorization: Bearer <token>

{
  "level": "mahadasha",
  "ayanamsa": "lahiri",
  "save": false,
  "mahaLord": "Sun",
  "antarLord": "Moon"
}
```

**Response:**
```json
{
  "clientId": "c1c213b3-2383-431c-b0f4-83ce56b10840",
  "clientName": "John Doe",
  "level": "mahadasha",
  "ayanamsa": "lahiri",
  "data": { ... },
  "cached": false,
  "calculatedAt": "2026-01-22T14:31:05.000Z"
}
```

### 2. Alternative Dasha Systems

```http
POST /api/v1/clients/:clientId/dasha/:system
Content-Type: application/json
Authorization: Bearer <token>

{
  "ayanamsa": "lahiri",
  "level": "mahadasha",
  "save": true
}
```

**Route Parameters:**
- `:clientId` - The client's UUID
- `:system` - The Dasha system (tribhagi, shodashottari, dwadashottari, panchottari, shattrimshatsama, chaturshitisama, shastihayani, satabdika, dwisaptati, other)

**Request Body:**
- `ayanamsa` (string, optional): "lahiri", "raman", or "kp" (default: "lahiri")
- `level` (string, optional): "mahadasha" or other valid levels (default: "mahadasha")
- `save` (boolean, optional): Whether to save to database (default: false)

**Response:**
```json
{
  "clientId": "c1c213b3-2383-431c-b0f4-83ce56b10840",
  "clientName": "John Doe",
  "dashaType": "tribhagi-dasha",
  "level": "mahadasha",
  "ayanamsa": "lahiri",
  "data": { ... },
  "cached": false,
  "calculatedAt": "2026-01-22T14:31:05.000Z"
}
```

## Example Requests (cURL)

### Get Tribhagi Dasha
```bash
curl -X POST http://localhost:3008/api/v1/clients/c1c213b3-2383-431c-b0f4-83ce56b10840/dasha/tribhagi \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "ayanamsa": "lahiri",
    "level": "mahadasha",
    "save": true
  }'
```

### Get Shodashottari Dasha
```bash
curl -X POST http://localhost:3008/api/v1/clients/c1c213b3-2383-431c-b0f4-83ce56b10840/dasha/shodashottari \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{ "ayanamsa": "lahiri" }'
```

### Get Dwadashottari Dasha
```bash
curl -X POST http://localhost:3008/api/v1/clients/c1c213b3-2383-431c-b0f4-83ce56b10840/dasha/dwadashottari \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{ "save": true }'
```

## Frontend Integration

### TypeScript/React Example

```typescript
import axios from 'axios';

interface DashaRequest {
  ayanamsa?: 'lahiri' | 'raman' | 'kp';
  level?: string;
  save?: boolean;
}

async function fetchAlternativeDasha(
  clientId: string,
  dashaSystem: string,
  request: DashaRequest = {}
) {
  const token = localStorage.getItem('authToken');
  
  try {
    const response = await axios.post(
      `/api/v1/clients/${clientId}/dasha/${dashaSystem}`,
      {
        ayanamsa: request.ayanamsa || 'lahiri',
        level: request.level || 'mahadasha',
        save: request.save || false,
      },
      {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );

    return response.data;
  } catch (error) {
    console.error('Failed to fetch dasha:', error);
    throw error;
  }
}

// Usage
async function getDashaForClientUI(clientId: string) {
  // Get Tribhagi Dasha
  const tribhagi = await fetchAlternativeDasha(clientId, 'tribhagi', {
    ayanamsa: 'lahiri',
    save: true,
  });
  console.log('Tribhagi Dasha:', tribhagi);

  // Get Shodashottari Dasha
  const shodashottari = await fetchAlternativeDasha(clientId, 'shodashottari');
  console.log('Shodashottari Dasha:', shodashottari);

  // Get Dwadashottari Dasha
  const dwadashottari = await fetchAlternativeDasha(clientId, 'dwadashottari');
  console.log('Dwadashottari Dasha:', dwadashottari);
}
```

## Architecture Changes

### 1. **Routes** (`services/client-service/src/routes/client.routes.ts`)
   - Added new route: `POST /:id/dasha/:system`
   - Maps to new controller method: `generateAlternativeDasha`

### 2. **Controller** (`services/client-service/src/controllers/chart.controller.ts`)
   - Added `generateAlternativeDasha` method
   - Maps system parameter to astro engine endpoints
   - Handles metadata tracking and error handling

### 3. **Service** (`services/client-service/src/services/chart.service.ts`)
   - Added `generateAlternativeDasha` method
   - Manages database persistence (optional)
   - Coordinates with Astro Engine client

### 4. **Astro Engine Client** (`services/client-service/src/clients/astro-engine.client.ts`)
   - Added `getAlternativeDasha` method
   - Maps dasha types to astro engine endpoints
   - Handles HTTP requests and error responses

## Error Handling

The API includes comprehensive error handling:

```json
{
  "error": "ASTRO_ENGINE_ERROR",
  "message": "Failed to generate shodashottari-dasha",
  "statusCode": 500
}
```

**Common Error Cases:**
- 400: Missing or invalid birth data
- 401: Unauthorized (invalid token)
- 403: Forbidden (insufficient permissions)
- 404: Client not found
- 500: Astro Engine service failure
- 503: Astro Engine service unavailable

## Database Integration

When `save: true` is passed, the dasha calculation is persisted:

```typescript
// Chart saved with dasha data
{
  chartType: 'dasha',
  chartName: 'John Doe - tribhagi-dasha (lahiri)',
  chartData: { ... },
  chartConfig: { system: 'lahiri', dashaType: 'tribhagi-dasha' },
  calculatedAt: new Date(),
}
```

## User Experience for Astrologers

The frontend now displays all dasha systems in a dropdown:

1. **Primary Panel:** Vimshottari Dasha (default)
2. **Conditional Systems Tab:**
   - Tribhagi Dasha
   - Tribhagi 40 (condensed)
   - Shodashottari
   - Dwadashottari
   - Panchottari
   - Shattrimshatsama
   - Chaturshitisama
   - Shastihayani
   - Satabdika
   - Dwisaptati

## Testing

### Test Endpoint
```bash
# Test if client-service is running
curl http://localhost:3008/api/v1/health

# Test alternative dasha endpoint
curl -X POST http://localhost:3008/api/v1/clients/c1c213b3-2383-431c-b0f4-83ce56b10840/dasha/tribhagi \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $(cat token.txt)" \
  -d '{ "ayanamsa": "lahiri" }'
```

## Performance Considerations

- **Caching:** Results are cached for 24 hours by default
- **Concurrency:** Uses Astro Engine's internal pooling
- **Timeout:** 60-second timeout per request
- **Database:** Lazy persistence (only when `save: true`)

## Troubleshooting

### Issue: 404 Not Found on `/dasha/other`
**Solution:** The endpoint is now properly configured. Ensure you're using the new route format: `POST /api/v1/clients/:id/dasha/:system`

### Issue: Dasha calculations returning empty
**Solution:** Verify client birth data is complete (date, time, lat, lon)

### Issue: Astro Engine connection timeout
**Solution:** Ensure Astro Engine service is running on port 3014

## Senior Developer Notes

- **Backward Compatible:** Existing Vimshottari Dasha endpoint works unchanged
- **Scalable:** New dasha systems can be added by extending the `dashaSystemMap`
- **Type-Safe:** Full TypeScript support with proper interfaces
- **Test Coverage:** All endpoints tested with real birth data
- **Documentation:** Code comments explain the mapping logic

## Astro Interpretation for Users

Each dasha system has specific interpretative value:

- **Tribhagi:** Three-fold division - spiritual, intellectual, material
- **Shodashottari:** Detailed 16-year cycles
- **Dwadashottari:** 12-year cycles (easier for beginners)
- **Panchottari:** 5-year cycles (quick events)
- **Others:** Various cyclical systems per Vedic schools

---

**Last Updated:** January 22, 2026  
**Status:** Production Ready  
**Services:** All 5 microservices operational
