// Open-Meteo API — бесплатно, без ключа, coords = Санкт-Петербург
const OPEN_METEO_URL =
  "https://api.open-meteo.com/v1/forecast" +
  "?latitude=59.9343&longitude=30.3351" +
  "&current=temperature_2m,weather_code,precipitation,cloud_cover" +
  "&timezone=Europe%2FMoscow";

const CACHE_TTL_MS = 3 * 60 * 60 * 1000; // 3 часа
const FETCH_TIMEOUT_MS = 8_000;

export type WeatherIcon = "sun" | "cloud" | "overcast" | "rain" | "snow" | "fog" | "storm";

export interface WeatherPayload {
  city: string;
  temperatureC: number | null;
  condition: string;
  icon: WeatherIcon;
  isRaining: boolean;
  updatedAt: string; // ISO
}

// --- Маппинг WMO weather codes → иконка + русское состояние ---
function mapWmoCode(code: number, precipitation: number): { condition: string; icon: WeatherIcon; isRaining: boolean } {
  const isRaining = precipitation > 0;

  if (code === 0) return { condition: "Ясно", icon: "sun", isRaining };
  if (code === 1 || code === 2) return { condition: "Облачно", icon: "cloud", isRaining };
  if (code === 3) return { condition: "Пасмурно", icon: "overcast", isRaining };
  if (code === 45 || code === 48) return { condition: "Туман", icon: "fog", isRaining: false };
  if (code >= 51 && code <= 55) return { condition: "Морось", icon: "rain", isRaining: true };
  if ((code >= 61 && code <= 65) || (code >= 80 && code <= 82)) return { condition: "Дождь", icon: "rain", isRaining: true };
  if (code === 66 || code === 67) return { condition: "Ледяной дождь", icon: "rain", isRaining: true };
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return { condition: "Снег", icon: "snow", isRaining: false };
  if (code >= 95) return { condition: "Гроза", icon: "storm", isRaining: true };

  return { condition: "Переменная облачность", icon: "cloud", isRaining };
}

// --- In-memory cache ---
let cachedWeather: WeatherPayload | null = null;
let cachedAt: number | null = null;

function isCacheFresh(): boolean {
  return cachedAt !== null && Date.now() - cachedAt < CACHE_TTL_MS;
}

const FALLBACK: WeatherPayload = {
  city: "Санкт-Петербург",
  temperatureC: null,
  condition: "Погода недоступна",
  icon: "cloud",
  isRaining: false,
  updatedAt: new Date().toISOString(),
};

export async function getSpbWeather(): Promise<WeatherPayload> {
  if (isCacheFresh() && cachedWeather) {
    return cachedWeather;
  }

  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), FETCH_TIMEOUT_MS);

  try {
    const response = await fetch(OPEN_METEO_URL, {
      signal: abort.signal,
      headers: { Accept: "application/json" },
    });

    if (!response.ok) {
      console.warn(`[weather] Open-Meteo responded ${response.status}`);
      return cachedWeather ?? FALLBACK;
    }

    const data = (await response.json()) as {
      current?: {
        temperature_2m?: number;
        weather_code?: number;
        precipitation?: number;
        cloud_cover?: number;
      };
    };

    const cur = data.current ?? {};
    const temperatureC = typeof cur.temperature_2m === "number" ? Math.round(cur.temperature_2m) : null;
    const wmoCode = typeof cur.weather_code === "number" ? cur.weather_code : 0;
    const precipitation = typeof cur.precipitation === "number" ? cur.precipitation : 0;

    const { condition, icon, isRaining } = mapWmoCode(wmoCode, precipitation);

    const payload: WeatherPayload = {
      city: "Санкт-Петербург",
      temperatureC,
      condition,
      icon,
      isRaining,
      updatedAt: new Date().toISOString(),
    };

    cachedWeather = payload;
    cachedAt = Date.now();
    return payload;
  } catch (error) {
    console.warn("[weather] Fetch failed:", (error as Error).message);
    return cachedWeather ?? FALLBACK;
  } finally {
    clearTimeout(timer);
  }
}
