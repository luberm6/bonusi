export type EndpointSet = {
  apiPrimary: string;
  apiSecondary?: string;
  wsPrimary: string;
  wsSecondary?: string;
};

export const MOBILE_ENDPOINTS: EndpointSet = {
  apiPrimary: "http://127.0.0.1:4010/api/v1",
  apiSecondary: "http://127.0.0.1:4011/api/v1",
  wsPrimary: "http://127.0.0.1:4010",
  wsSecondary: "http://127.0.0.1:4011"
};

export function getApiBase(useFallback = false): string {
  if (useFallback && MOBILE_ENDPOINTS.apiSecondary) return MOBILE_ENDPOINTS.apiSecondary;
  return MOBILE_ENDPOINTS.apiPrimary;
}

export function getWsBase(useFallback = false): string {
  if (useFallback && MOBILE_ENDPOINTS.wsSecondary) return MOBILE_ENDPOINTS.wsSecondary;
  return MOBILE_ENDPOINTS.wsPrimary;
}
