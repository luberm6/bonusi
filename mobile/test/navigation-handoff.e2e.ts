import type { NavigatorApp, NavigatorPicker, UrlLauncher } from "../src/shared/navigation/navigation-handoff";
import { NavigationHandoffService } from "../src/shared/navigation/navigation-handoff";

function assert(condition: boolean, message: string) {
  if (!condition) throw new Error(message);
}

class FakeLauncher implements UrlLauncher {
  opened: string[] = [];
  constructor(
    public platform: "ios" | "android" | "web",
    private readonly supported: Set<string>
  ) {}

  async canOpenURL(url: string): Promise<boolean> {
    return this.supported.has(url);
  }

  async openURL(url: string): Promise<void> {
    this.opened.push(url);
  }
}

class FixedPicker implements NavigatorPicker {
  constructor(private readonly chosen: NavigatorApp | null) {}
  async pick(): Promise<NavigatorApp | null> {
    return this.chosen;
  }
}

const branch = {
  id: "b1",
  name: "Central Branch",
  address: "Main",
  lat: 59.93428,
  lng: 30.33509,
  isActive: true
};

function containsCoords(url: string): boolean {
  return url.includes("59.934280") && url.includes("30.335090");
}

async function run() {
  const yandexUrl =
    "yandexnavi://build_route_on_map?lat_to=59.934280&lon_to=30.335090&text=Central%20Branch";
  const appleUrl = "http://maps.apple.com/?daddr=59.934280,30.335090&q=Central%20Branch";
  const googleIosUrl =
    "comgooglemaps://?daddr=59.934280,30.335090&directionsmode=driving&q=Central%20Branch";

  const launcherYandex = new FakeLauncher("ios", new Set([yandexUrl, appleUrl, googleIosUrl]));
  const serviceYandex = new NavigationHandoffService(launcherYandex, new FixedPicker("yandex"));
  const resultYandex = await serviceYandex.openRoute(branch);
  assert(resultYandex.opened === "yandex", "should launch Yandex when available");
  assert(launcherYandex.opened[0] === yandexUrl, "wrong Yandex URL");
  assert(containsCoords(launcherYandex.opened[0]), "coordinates missing in Yandex URL");
  console.log("launch_yandex=ok");

  const launcherFallback = new FakeLauncher("ios", new Set([appleUrl, googleIosUrl]));
  const serviceFallback = new NavigationHandoffService(launcherFallback, new FixedPicker("yandex"));
  const resultFallback = await serviceFallback.openRoute(branch);
  assert(resultFallback.usedFallback, "fallback expected");
  assert(resultFallback.opened === "google" || resultFallback.opened === "apple", "fallback should use installed navigator");
  assert(containsCoords(launcherFallback.opened[0]), "coordinates missing in fallback URL");
  console.log("fallback_apple_google=ok");

  const launcherNone = new FakeLauncher("android", new Set());
  const serviceNone = new NavigationHandoffService(launcherNone, new FixedPicker("yandex"));
  const resultNone = await serviceNone.openRoute(branch);
  assert(resultNone.opened === "google_web", "should fallback to google web when no navigator available");
  assert(resultNone.url.includes("google.com/maps/dir"), "expected web maps fallback");
  assert(containsCoords(resultNone.url), "coordinates missing in web fallback");
  console.log("fallback_no_navigator=ok");
}

run().catch((error) => {
  console.error(error);
  process.exit(1);
});
