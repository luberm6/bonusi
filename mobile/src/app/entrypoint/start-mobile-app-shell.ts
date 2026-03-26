import {
  bootstrapMobileApp,
  type MobileAppBootstrap,
  type MobileAppBootstrapInput
} from "../bootstrap/mobile-app-bootstrap";

// Intended RN entrypoint integration:
// - restore auth session
// - initialize SQLite-backed offline runtime
// - start reconnect lifecycle
export async function startMobileAppShell(input: MobileAppBootstrapInput): Promise<MobileAppBootstrap> {
  return bootstrapMobileApp(input);
}

