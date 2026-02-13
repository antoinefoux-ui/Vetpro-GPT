import { NextFunction, Request, Response } from "express";

export type AppRole = "ADMIN" | "VETERINARIAN" | "NURSE" | "RECEPTIONIST" | "SHOP_STAFF";

export function requireRole(allowedRoles: AppRole[]) {
  return (req: Request, res: Response, next: NextFunction) => {
    const role = (req.headers["x-role"] as AppRole | undefined) ?? "RECEPTIONIST";

    if (!allowedRoles.includes(role)) {
      return res.status(403).json({ error: "Forbidden", role, allowedRoles });
    }

    req.headers["x-role"] = role;
    return next();
  };
}
