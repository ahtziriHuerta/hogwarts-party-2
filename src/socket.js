import { io } from "socket.io-client";

const SERVER_URL = import.meta.env.VITE_SERVER_URL || "http://localhost:3001";

export const socket = io(SERVER_URL, {
  autoConnect: false,
  timeout: 65_000,
  tryAllTransports: true,
  reconnectionDelay: 1500,
  reconnectionDelayMax: 5000,
});
