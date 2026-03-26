import type { BranchMapItem } from "../types/map";

export type NavigatorApp = "yandex" | "apple" | "google";

export type UrlLaunchTarget = {
  app: NavigatorApp;
  label: string;
  url: string;
  fallbackPriority: number;
};

export interface UrlLauncher {
  platform: "ios" | "android" | "web";
  canOpenURL(url: string): Promise<boolean>;
  openURL(url: string): Promise<void>;
}

export interface NavigatorPicker {
  pick(options: Array<{ app: NavigatorApp; label: string }>): Promise<NavigatorApp | null>;
}

export type NavigationLaunchResult = {
  requested: NavigatorApp | null;
  opened: NavigatorApp | "google_web";
  url: string;
  usedFallback: boolean;
};

function q(input: string): string {
  return encodeURIComponent(input);
}

function buildTargets(branch: BranchMapItem, platform: UrlLauncher["platform"]): UrlLaunchTarget[] {
  const lat = branch.lat.toFixed(6);
  const lng = branch.lng.toFixed(6);
  const name = branch.name;

  const yandex = `yandexnavi://build_route_on_map?lat_to=${lat}&lon_to=${lng}&text=${q(name)}`;
  const apple = `http://maps.apple.com/?daddr=${lat},${lng}&q=${q(name)}`;
  const googleApp =
    platform === "ios"
      ? `comgooglemaps://?daddr=${lat},${lng}&directionsmode=driving&q=${q(name)}`
      : `geo:${lat},${lng}?q=${lat},${lng}(${q(name)})`;

  const targets: UrlLaunchTarget[] = [
    { app: "yandex", label: "Yandex Navigator", url: yandex, fallbackPriority: 1 },
    { app: "google", label: "Google Maps", url: googleApp, fallbackPriority: 2 }
  ];
  if (platform === "ios") {
    targets.push({ app: "apple", label: "Apple Maps", url: apple, fallbackPriority: 2 });
  }
  if (platform === "web") {
    targets.splice(0, targets.length, {
      app: "google",
      label: "Google Maps",
      url: `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&destination_place_id=${q(name)}`,
      fallbackPriority: 1
    });
  }
  return targets;
}

function googleWebFallback(branch: BranchMapItem): string {
  const lat = branch.lat.toFixed(6);
  const lng = branch.lng.toFixed(6);
  return `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}&travelmode=driving`;
}

export class NavigationHandoffService {
  constructor(
    private readonly launcher: UrlLauncher,
    private readonly picker: NavigatorPicker
  ) {}

  async openRoute(branch: BranchMapItem): Promise<NavigationLaunchResult> {
    const targets = buildTargets(branch, this.launcher.platform);
    if (!targets.length) {
      const fallback = googleWebFallback(branch);
      await this.launcher.openURL(fallback);
      return { requested: null, opened: "google_web", url: fallback, usedFallback: true };
    }

    const availableMap = new Map<NavigatorApp, UrlLaunchTarget>();
    for (const target of targets) {
      const ok = await this.launcher.canOpenURL(target.url);
      if (ok) availableMap.set(target.app, target);
    }

    const selection = await this.picker.pick(
      targets.map((t) => ({ app: t.app, label: t.label }))
    );

    const selected = selection ? availableMap.get(selection) : undefined;
    if (selected) {
      await this.launcher.openURL(selected.url);
      return { requested: selection, opened: selected.app, url: selected.url, usedFallback: false };
    }

    const fallback = [...availableMap.values()].sort((a, b) => a.fallbackPriority - b.fallbackPriority)[0];
    if (fallback) {
      await this.launcher.openURL(fallback.url);
      return {
        requested: selection ?? null,
        opened: fallback.app,
        url: fallback.url,
        usedFallback: true
      };
    }

    const googleWeb = googleWebFallback(branch);
    await this.launcher.openURL(googleWeb);
    return {
      requested: selection ?? null,
      opened: "google_web",
      url: googleWeb,
      usedFallback: true
    };
  }
}
