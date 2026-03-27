import { io, type Socket } from "socket.io-client";
import { getWsBase } from "../config/failover-endpoints";

export type ChatSocketConnectOptions = {
  token: string;
};

export function createChatSocket(options: ChatSocketConnectOptions): Socket {
  return io(getWsBase(), {
    auth: { token: options.token },
    reconnection: true,
    reconnectionAttempts: 10,
    reconnectionDelay: 500,
    reconnectionDelayMax: 8000,
    timeout: 10000,
    transports: ["websocket", "polling"]
  });
}
