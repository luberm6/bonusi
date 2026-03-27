export type EndpointSet = {
  apiPrimary: string;
  wsPrimary: string;
};

export const MOBILE_ENDPOINTS: EndpointSet = {
  apiPrimary: "https://autoservice-backend-atyj.onrender.com/api/v1",
  wsPrimary: "https://autoservice-backend-atyj.onrender.com"
};

export function getApiBase(): string {
  return MOBILE_ENDPOINTS.apiPrimary;
}

export function getWsBase(): string {
  return MOBILE_ENDPOINTS.wsPrimary;
}
