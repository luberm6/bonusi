import { io, type Socket } from "socket.io-client";
import { resolveWsBase } from "../config/failover-endpoints";

export type WebChatSocketOptions = {
  token: string;
  useFallbackEndpoint?: boolean;
};

export function createWebChatSocket(options: WebChatSocketOptions): Socket {
  return io(resolveWsBase(options.useFallbackEndpoint ?? false), {
    auth: { token: options.token },
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 500,
    reconnectionDelayMax: 8000,
    timeout: 10000,
    // WebSocket preferred, HTTP polling fallback for degraded ws networks/proxies.
    transports: ["websocket", "polling"]
  });
}
