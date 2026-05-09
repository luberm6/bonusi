import { mobileEnv } from "../config/mobile-env";

export type WeatherIcon = "sun" | "cloud" | "overcast" | "rain" | "snow" | "fog" | "storm";

export interface WeatherData {
  city: string;
  temperatureC: number | null;
  condition: string;
  icon: WeatherIcon;
  isRaining: boolean;
  updatedAt: string;
}

const FALLBACK: WeatherData = {
  city: "Санкт-Петербург",
  temperatureC: null,
  condition: "Погода недоступна",
  icon: "cloud",
  isRaining: false,
  updatedAt: new Date().toISOString(),
};

export async function fetchSpbWeather(): Promise<WeatherData> {
  try {
    const res = await fetch(`${mobileEnv.apiBaseUrl}/weather/spb`, {
      headers: { Accept: "application/json" },
    });
    if (!res.ok) return FALLBACK;
    const data = (await res.json()) as Partial<WeatherData>;
    if (typeof data.temperatureC !== "number" && data.temperatureC !== null) return FALLBACK;
    return data as WeatherData;
  } catch {
    return FALLBACK;
  }
}
