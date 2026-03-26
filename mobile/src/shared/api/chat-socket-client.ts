import { io, type Socket } from "socket.io-client";
import { getWsBase } from "../config/failover-endpoints";

export type ChatSocketConnectOptions = {
  token: string;
  useFallbackEndpoint?: boolean;
};

export function createChatSocket(options: ChatSocketConnectOptions): Socket {
  return io(getWsBase(options.useFallbackEndpoint ?? false), {
    auth: { token: options.token },
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 500,
    reconnectionDelayMax: 8000,
    timeout: 10000,
    // readiness for ws degradation: allow polling fallback.
    transports: ["websocket", "polling"]
  });
}
