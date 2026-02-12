import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { api } from "../lib/api";
import type { AuthUser } from "../types/app";

interface AuthContextValue {
  user: AuthUser | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = localStorage.getItem("vetpro_access_token");
    if (!token) {
      setLoading(false);
      return;
    }

    api
      .me()
      .then((response) => setUser(response.user as AuthUser))
      .catch(() => {
        localStorage.removeItem("vetpro_access_token");
        localStorage.removeItem("vetpro_refresh_token");
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(email: string, password: string) {
    const response = await api.login(email, password);
    localStorage.setItem("vetpro_access_token", response.accessToken);
    localStorage.setItem("vetpro_refresh_token", response.refreshToken);
    setUser(response.user as AuthUser);
  }

  async function logout() {
    const refreshToken = localStorage.getItem("vetpro_refresh_token");
    if (refreshToken) {
      try {
        await api.logout(refreshToken);
      } catch {
        // no-op for now
      }
    }

    localStorage.removeItem("vetpro_access_token");
    localStorage.removeItem("vetpro_refresh_token");
    setUser(null);
  }

  const value = useMemo(() => ({ user, loading, login, logout }), [user, loading]);
  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider");
  return ctx;
}
