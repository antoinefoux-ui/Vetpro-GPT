import type { UserRole } from "../types/app";
import { useAuth } from "./AuthProvider";

export function RoleGate({
  roles,
  children,
  fallback = null
}: {
  roles: UserRole[];
  children: JSX.Element;
  fallback?: JSX.Element | null;
}) {
  const { user } = useAuth();
  if (!user || !roles.includes(user.role)) return fallback;
  return children;
}
