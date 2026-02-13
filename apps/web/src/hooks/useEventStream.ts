import { useEffect } from "react";

export function useEventStream(path: string, onData: (payload: unknown) => void) {
  useEffect(() => {
    const token = localStorage.getItem("vetpro_access_token");
    if (!token) return;

    // token in query string only because EventSource doesn't support custom headers
    const source = new EventSource(`${path}?token=${encodeURIComponent(token)}`);
    source.addEventListener("dashboard", (event) => {
      const data = JSON.parse((event as MessageEvent).data);
      onData(data);
    });
    return () => source.close();
  }, [path, onData]);
}
