curl -X POST https://astroengine.astrocorp.in/lahiri/guru-chandal-analysis \
  -H "Content-Type: application/json" \
  -d '{
    "user_name": "Test User",
    "birth_date": "1990-01-01",
    "birth_time": "12:00:00",
    "latitude": "28.6139",
    "longitude": "77.2090",
    "timezone_offset": 5.5,
    "system": "lahiri",
    "ayanamsa": "lahiri"
  }'
