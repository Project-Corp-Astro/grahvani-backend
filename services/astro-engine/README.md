# Astro Engine Proxy Service

**Port**: 3014

Proxy service for Vedic astrology chart calculations. Communicates with external Astro Engine Python API.

## Setup

```bash
# Install dependencies
npm install

# Copy environment file
cp .env.example .env

# Run in development
npm run dev
```

## Internal API Endpoints

| Method | Route | Description |
|--------|-------|-------------|
| POST | `/internal/natal` | Generate natal (D1) chart |
| POST | `/internal/divisional/:type` | Generate D2-D60 charts |
| POST | `/internal/ashtakavarga` | Ashtakavarga analysis |
| POST | `/internal/dasha/vimshottari` | Vimshottari dasha periods |
| POST | `/internal/dasha/prana` | 5-level dasha calculation |
| GET | `/health` | Health check |

## Request Format

```json
{
    "birthDate": "1990-01-15",
    "birthTime": "10:30:00",
    "latitude": 28.6139,
    "longitude": 77.2090,
    "timezoneOffset": 5.5,
    "system": "lahiri"
}
```

## Configuration

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3014 | Service port |
| `ASTRO_ENGINE_EXTERNAL_URL` | - | External API URL |
| `REDIS_URL` | redis://localhost:6379 | Redis connection |
| `CACHE_TTL_SECONDS` | 86400 | Cache TTL (24h) |
