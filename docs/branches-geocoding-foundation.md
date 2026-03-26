# Branches + Geocoding Foundation (Phase 5)

## Implemented modules

- `branches`:
  - CRUD for branches
  - deactivate endpoint
  - role-aware read model (`client` sees only active branches)
  - audit events for create/update/deactivate
- `geocoding`:
  - `POST /geocode`
  - Nominatim integration from backend only
  - cache in `geocode_cache`
  - provider failure handling and stale-cache fallback
  - rate limiting

## Endpoints

- `POST /api/v1/branches`
- `GET /api/v1/branches`
- `GET /api/v1/branches/:id`
- `PATCH /api/v1/branches/:id`
- `PATCH /api/v1/branches/:id/deactivate`
- `POST /api/v1/geocode`

## Payload examples

`POST /api/v1/branches`

```json
{
  "name": "Downtown",
  "address": "11 Wall St, New York, NY",
  "lat": 40.70749,
  "lng": -74.01127,
  "phone": "+1-555-0199",
  "workHours": { "mon_fri": "09:00-20:00", "sat": "10:00-16:00" },
  "description": "Main branch",
  "isActive": true
}
```

`POST /api/v1/geocode`

```json
{ "address": "Times Square, New York, NY" }
```

## Caching strategy

- Address query is normalized and looked up in `geocode_cache`.
- Cache key: `(source='nominatim', query_hash)` where `query_hash` is SHA-256 over normalized query.
- Fresh cache is returned without calling Nominatim.
- On cache miss: backend calls Nominatim, stores normalized address + coordinates + raw payload.
- On provider failure: stale cache can be returned when available; otherwise `503`.
