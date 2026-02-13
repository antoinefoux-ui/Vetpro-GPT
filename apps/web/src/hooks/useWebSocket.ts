import { useEffect } from "react";

export function useWebSocket(path: string, onMessage: (payload: unknown) => void) {
  useEffect(() => {
    const token = localStorage.getItem("vetpro_access_token");
    if (!token) return;
    const socket = new WebSocket(`${path}?token=${encodeURIComponent(token)}`);
    socket.onmessage = (event) => {
      try {
        const parsed = JSON.parse(event.data) as { type?: string; payload?: unknown };
        if (parsed && typeof parsed === "object" && "payload" in parsed && parsed.type === "dashboard") {
          onMessage(parsed.payload);
          return;
        }
        onMessage(parsed);
      } catch {
        onMessage(event.data);
      }
    };
    return () => socket.close();
  }, [onMessage, path]);
}
