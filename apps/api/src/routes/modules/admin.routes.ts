import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.js";
import { requirePermission, rolePermissions } from "../../middleware/permissions.js";
import { listAuditEvents, logAuditEvent } from "../../services/audit.service.js";
import { listUsers, updateUserRole } from "../../services/auth.service.js";
import {
  buildClientExportPackage,
  createGdprRequest,
  evaluateDeletionImpact,
  listGdprRequests,
  setGdprRequestStatus
} from "../../services/gdpr.service.js";
import { getSettings, updateSettings } from "../../services/settings.service.js";

const querySchema = z.object({
  limit: z.coerce.number().int().positive().max(500).optional()
});

const roleUpdateSchema = z.object({
  role: z.enum(["ADMIN", "VETERINARIAN", "NURSE", "RECEPTIONIST", "SHOP_STAFF"])
});

const gdprSchema = z.object({
  clientId: z.string().min(1),
  type: z.enum(["EXPORT", "DELETE"])
});

const gdprStatusSchema = z.object({
  status: z.enum(["REQUESTED", "IN_PROGRESS", "COMPLETED", "REJECTED"])
});

const settingsPatchSchema = z.object({
  clinicName: z.string().min(1).optional(),
  timezone: z.string().min(1).optional(),
  defaultLanguage: z.enum(["en", "sk"]).optional(),
  appointmentDefaultMinutes: z.number().int().positive().optional(),
  reminder24hEnabled: z.boolean().optional()
});

export const adminRouter = Router();
adminRouter.use(requireAuth, requirePermission("admin.read"));

adminRouter.get("/system-health", (_req, res) => {
  res.json({
    status: "ok",
    backupFrequencyHours: 6,
    encryptionAtRest: true,
    encryptionInTransit: true,
    auditTrailEnabled: true
  });
});

adminRouter.get("/audit-logs", (req, res) => {
  const parsed = querySchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  return res.json({ items: listAuditEvents(parsed.data.limit ?? 100) });
});

adminRouter.get("/permissions", (_req, res) => {
  return res.json({ rolePermissions });
});

adminRouter.get("/staff", (_req, res) => {
  return res.json({ items: listUsers() });
});

adminRouter.patch("/staff/:id/role", requirePermission("admin.write"), async (req, res) => {
  const parsed = roleUpdateSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  try {
    const user = updateUserRole(req.params.id, parsed.data.role);
    await logAuditEvent({
      userId: req.user!.id,
      action: "STAFF_ROLE_UPDATED",
      entityType: "User",
      entityId: user.id,
      metadata: { role: user.role },
      ipAddress: req.ip
    });
    return res.json(user);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
});

adminRouter.get("/gdpr-requests", (_req, res) => {
  return res.json({ items: listGdprRequests() });
});

adminRouter.post("/gdpr-requests", requirePermission("admin.write"), async (req, res) => {
  const parsed = gdprSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  try {
    const request = createGdprRequest({ ...parsed.data, requestedByUserId: req.user!.id });
    await logAuditEvent({
      userId: req.user!.id,
      action: "GDPR_REQUEST_CREATED",
      entityType: "GdprRequest",
      entityId: request.id,
      metadata: { type: request.type, clientId: request.clientId },
      ipAddress: req.ip
    });
    return res.status(201).json(request);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
});

adminRouter.patch("/gdpr-requests/:id/status", requirePermission("admin.write"), async (req, res) => {
  const parsed = gdprStatusSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  try {
    const request = setGdprRequestStatus(req.params.id, parsed.data.status);
    await logAuditEvent({
      userId: req.user!.id,
      action: "GDPR_REQUEST_STATUS_UPDATED",
      entityType: "GdprRequest",
      entityId: request.id,
      metadata: { status: request.status },
      ipAddress: req.ip
    });
    return res.json(request);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
});

adminRouter.get('/gdpr-export/:clientId', requirePermission('admin.read'), (req, res) => {
  try {
    return res.json({ package: buildClientExportPackage(req.params.clientId) });
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
});

adminRouter.get('/gdpr-delete-check/:clientId', requirePermission('admin.read'), (req, res) => {
  try {
    return res.json(evaluateDeletionImpact(req.params.clientId));
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
});

adminRouter.get("/settings", (_req, res) => {
  return res.json(getSettings());
});

adminRouter.patch("/settings", requirePermission("admin.write"), async (req, res) => {
  const parsed = settingsPatchSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  const settings = updateSettings(parsed.data);
  await logAuditEvent({
    userId: req.user!.id,
    action: "SETTINGS_UPDATED",
    entityType: "SystemSettings",
    entityId: "global",
    metadata: parsed.data,
    ipAddress: req.ip
  });
  return res.json(settings);
});
