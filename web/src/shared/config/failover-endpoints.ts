export type EndpointSet = {
  apiPrimary: string;
  apiSecondary?: string;
  wsPrimary: string;
  wsSecondary?: string;
};

export const WEB_ENDPOINTS: EndpointSet = {
  apiPrimary: "https://api-primary.internal.example.com/api/v1",
  apiSecondary: "https://api-secondary.internal.example.com/api/v1",
  wsPrimary: "wss://api-primary.internal.example.com",
  wsSecondary: "wss://api-secondary.internal.example.com"
};

export function resolveApiBase(preferSecondary = false): string {
  if (preferSecondary && WEB_ENDPOINTS.apiSecondary) return WEB_ENDPOINTS.apiSecondary;
  return WEB_ENDPOINTS.apiPrimary;
}

export function resolveWsBase(preferSecondary = false): string {
  if (preferSecondary && WEB_ENDPOINTS.wsSecondary) return WEB_ENDPOINTS.wsSecondary;
  return WEB_ENDPOINTS.wsPrimary;
}
