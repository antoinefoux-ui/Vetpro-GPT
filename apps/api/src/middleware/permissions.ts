import type { NextFunction, Request, Response } from "express";
import type { UserRole } from "../types/domain.js";

export type Permission =
  | "crm.read"
  | "crm.write"
  | "schedule.read"
  | "schedule.write"
  | "billing.read"
  | "billing.write"
  | "inventory.read"
  | "inventory.write"
  | "admin.read"
  | "admin.write";

export const rolePermissions: Record<UserRole, Permission[]> = {
  ADMIN: [
    "crm.read",
    "crm.write",
    "schedule.read",
    "schedule.write",
    "billing.read",
    "billing.write",
    "inventory.read",
    "inventory.write",
    "admin.read",
    "admin.write"
  ],
  VETERINARIAN: ["crm.read", "crm.write", "schedule.read", "schedule.write", "billing.read", "inventory.read"],
  NURSE: ["crm.read", "crm.write", "schedule.read", "inventory.read"],
  RECEPTIONIST: ["crm.read", "crm.write", "schedule.read", "schedule.write", "billing.read", "billing.write"],
  SHOP_STAFF: ["inventory.read", "inventory.write", "billing.read", "billing.write"]
};

export function requirePermission(permission: Permission) {
  return (req: Request, res: Response, next: NextFunction) => {
    if (!req.user) return res.status(401).json({ error: "Unauthorized" });
    const granted = rolePermissions[req.user.role] ?? [];
    if (!granted.includes(permission)) {
      return res.status(403).json({ error: "Forbidden", permission, role: req.user.role });
    }
    return next();
  };
}
