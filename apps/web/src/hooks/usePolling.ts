import { useEffect } from "react";

export function usePolling(callback: () => void | Promise<void>, ms: number) {
  useEffect(() => {
    callback();
    const id = setInterval(() => {
      void callback();
    }, ms);
    return () => clearInterval(id);
  }, [callback, ms]);
}
