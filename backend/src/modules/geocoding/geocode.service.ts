import { createHash } from "crypto";
import { env } from "../../common/config/env.js";
import { pool } from "../../common/db/pool.js";
import { HttpError } from "../../common/http/error.js";

type GeocodeResult = {
  normalizedAddress: string;
  lat: number;
  lng: number;
  source: string;
  cached: boolean;
  stale?: boolean;
};

function normalizeQuery(address: string): string {
  return address.trim().replace(/\s+/g, " ");
}

function hashQuery(query: string): string {
  return createHash("sha256").update(query.toLowerCase()).digest("hex");
}

function parseCoord(value: string, field: "lat" | "lng"): number {
  const n = Number(value);
  if (!Number.isFinite(n)) throw new HttpError(502, `Invalid ${field} from geocoder`);
  return Number(n.toFixed(6));
}

async function getCache(query: string, includeExpired = false) {
  const queryHash = hashQuery(query);
  const sql = includeExpired
    ? `select normalized_address, lat, lng, source, expires_at
       from public.geocode_cache
       where source = 'nominatim' and query_hash = $1
       order by created_at desc
       limit 1`
    : `select normalized_address, lat, lng, source, expires_at
       from public.geocode_cache
       where source = 'nominatim' and query_hash = $1
         and (expires_at is null or expires_at > now())
       order by created_at desc
       limit 1`;
  const result = await pool.query(sql, [queryHash]);
  if (!result.rowCount) return null;
  return result.rows[0] as {
    normalized_address: string;
    lat: string;
    lng: string;
    source: string;
    expires_at: Date | null;
  };
}

async function saveCache(input: {
  query: string;
  normalizedAddress: string;
  lat: number;
  lng: number;
  rawPayload: unknown;
}) {
  await pool.query(
    `insert into public.geocode_cache
     (query, normalized_address, lat, lng, source, raw_payload, expires_at)
     values ($1, $2, $3, $4, 'nominatim', $5::jsonb, now() + ($6::text || ' days')::interval)
     on conflict (source, query_hash)
     do update set
       normalized_address = excluded.normalized_address,
       lat = excluded.lat,
       lng = excluded.lng,
       raw_payload = excluded.raw_payload,
       created_at = now(),
       expires_at = excluded.expires_at`,
    [
      input.query,
      input.normalizedAddress,
      input.lat,
      input.lng,
      JSON.stringify(input.rawPayload ?? {}),
      String(env.geocodeCacheTtlDays)
    ]
  );
}

export async function geocodeAddress(rawAddress: string): Promise<GeocodeResult> {
  const query = normalizeQuery(rawAddress);
  if (query.length < 5) throw new HttpError(400, "Address is too short");

  const cacheHit = await getCache(query);
  if (cacheHit) {
    return {
      normalizedAddress: cacheHit.normalized_address,
      lat: Number(cacheHit.lat),
      lng: Number(cacheHit.lng),
      source: cacheHit.source,
      cached: true
    };
  }

  const staleCache = await getCache(query, true);
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), env.nominatimTimeoutMs);

  try {
    const url = new URL("/search", env.nominatimBaseUrl);
    url.searchParams.set("q", query);
    url.searchParams.set("format", "jsonv2");
    url.searchParams.set("addressdetails", "1");
    url.searchParams.set("limit", "1");

    const response = await fetch(url.toString(), {
      method: "GET",
      headers: {
        "User-Agent": env.nominatimUserAgent,
        Accept: "application/json"
      },
      signal: abort.signal
    });

    if (!response.ok) {
      if (staleCache) {
        return {
          normalizedAddress: staleCache.normalized_address,
          lat: Number(staleCache.lat),
          lng: Number(staleCache.lng),
          source: staleCache.source,
          cached: true,
          stale: true
        };
      }
      throw new HttpError(503, "Geocoding provider is temporarily unavailable");
    }

    const payload = (await response.json()) as Array<Record<string, unknown>>;
    if (!Array.isArray(payload) || payload.length === 0) {
      throw new HttpError(404, "Address not found");
    }

    const best = payload[0];
    const lat = parseCoord(String(best.lat ?? ""), "lat");
    const lng = parseCoord(String(best.lon ?? ""), "lng");
    const normalizedAddress = String(best.display_name ?? query);

    await saveCache({ query, normalizedAddress, lat, lng, rawPayload: best });
    return {
      normalizedAddress,
      lat,
      lng,
      source: "nominatim",
      cached: false
    };
  } catch (error) {
    if (error instanceof HttpError) throw error;
    if (staleCache) {
      return {
        normalizedAddress: staleCache.normalized_address,
        lat: Number(staleCache.lat),
        lng: Number(staleCache.lng),
        source: staleCache.source,
        cached: true,
        stale: true
      };
    }
    throw new HttpError(503, "Failed to geocode address", { reason: (error as Error).message });
  } finally {
    clearTimeout(timer);
  }
}
