import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.js";
import { requirePermission } from "../../middleware/permissions.js";
import { assignAppointmentResources, calendarGrid, createAppointment, listAppointments, listNoShows, listWaitlist, markNoShow, moveAppointment, addWaitlistEntry, updateAppointmentStatus, updateWaitlistStatus } from "../../services/scheduling.service.js";
import { logAuditEvent } from "../../services/audit.service.js";

const appointmentSchema = z.object({
  petId: z.string().min(1),
  veterinarianId: z.string().optional(),
  type: z.string().min(1),
  reason: z.string().optional(),
  startsAt: z.string().datetime(),
  endsAt: z.string().datetime()
});

const statusSchema = z.object({
  status: z.enum(["SCHEDULED", "CONFIRMED", "CHECKED_IN", "COMPLETED", "CANCELED"])
});

const resourceSchema = z.object({
  room: z.string().optional(),
  equipment: z.string().optional()
});

const moveSchema = z.object({ startsAt: z.string().datetime(), endsAt: z.string().datetime() });
const gridQuerySchema = z.object({ view: z.enum(["day", "week", "month"]), anchorDate: z.string().datetime() });
const waitlistSchema = z.object({ petId: z.string().min(1), reason: z.string().min(2), preferredDate: z.string().datetime().optional() });
const waitlistStatusSchema = z.object({ status: z.enum(["WAITING", "CONTACTED", "BOOKED", "CANCELED"]) });
const noShowSchema = z.object({ reason: z.string().optional() });

export const appointmentRouter = Router();
appointmentRouter.use(requireAuth);

appointmentRouter.get("/calendar", requirePermission("schedule.read"), (_req, res) => {
  res.json({ items: listAppointments() });
});

appointmentRouter.get("/calendar-grid", requirePermission("schedule.read"), (req, res) => {
  const parsed = gridQuerySchema.safeParse(req.query);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  try {
    return res.json({ buckets: calendarGrid(parsed.data.view, parsed.data.anchorDate) });
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
});

appointmentRouter.post("/calendar", requirePermission("schedule.write"), async (req, res) => {
  const parsed = appointmentSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  try {
    const appointment = createAppointment(parsed.data);
    await logAuditEvent({
      userId: req.user!.id,
      action: "APPOINTMENT_CREATED",
      entityType: "Appointment",
      entityId: appointment.id,
      metadata: { startsAt: appointment.startsAt, endsAt: appointment.endsAt, type: appointment.type },
      ipAddress: req.ip
    });
    return res.status(201).json(appointment);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
});

appointmentRouter.patch("/calendar/:id/status", requirePermission("schedule.write"), async (req, res) => {
  const parsed = statusSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  try {
    const appointment = updateAppointmentStatus(req.params.id, parsed.data.status);
    await logAuditEvent({
      userId: req.user!.id,
      action: "APPOINTMENT_STATUS_UPDATED",
      entityType: "Appointment",
      entityId: appointment.id,
      metadata: { status: appointment.status },
      ipAddress: req.ip
    });
    return res.json(appointment);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
});

appointmentRouter.patch("/calendar/:id/resources", requirePermission("schedule.write"), async (req, res) => {
  const parsed = resourceSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  try {
    const appointment = assignAppointmentResources(req.params.id, parsed.data);
    await logAuditEvent({
      userId: req.user!.id,
      action: "APPOINTMENT_RESOURCES_ASSIGNED",
      entityType: "Appointment",
      entityId: appointment.id,
      metadata: { room: appointment.room, equipment: appointment.equipment },
      ipAddress: req.ip
    });
    return res.json(appointment);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
});

appointmentRouter.patch("/calendar/:id/move", requirePermission("schedule.write"), async (req, res) => {
  const parsed = moveSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  try {
    const appointment = moveAppointment(req.params.id, parsed.data.startsAt, parsed.data.endsAt);
    await logAuditEvent({
      userId: req.user!.id,
      action: "APPOINTMENT_MOVED",
      entityType: "Appointment",
      entityId: appointment.id,
      metadata: { startsAt: appointment.startsAt, endsAt: appointment.endsAt },
      ipAddress: req.ip
    });
    return res.json(appointment);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
});

appointmentRouter.get("/waitlist", requirePermission("schedule.read"), (_req, res) => {
  res.json({ items: listWaitlist() });
});

appointmentRouter.post("/waitlist", requirePermission("schedule.write"), async (req, res) => {
  const parsed = waitlistSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  try {
    const row = addWaitlistEntry(parsed.data);
    await logAuditEvent({ userId: req.user!.id, action: "WAITLIST_ADDED", entityType: "Waitlist", entityId: row.id, metadata: parsed.data, ipAddress: req.ip });
    return res.status(201).json(row);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
});

appointmentRouter.patch("/waitlist/:id/status", requirePermission("schedule.write"), async (req, res) => {
  const parsed = waitlistStatusSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  try {
    const row = updateWaitlistStatus(req.params.id, parsed.data.status);
    await logAuditEvent({ userId: req.user!.id, action: "WAITLIST_STATUS_UPDATED", entityType: "Waitlist", entityId: row.id, metadata: parsed.data, ipAddress: req.ip });
    return res.json(row);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
});


appointmentRouter.get("/no-shows", requirePermission("schedule.read"), (_req, res) => {
  res.json({ items: listNoShows() });
});

appointmentRouter.patch("/calendar/:id/no-show", requirePermission("schedule.write"), async (req, res) => {
  const parsed = noShowSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  try {
    const row = markNoShow(req.params.id, parsed.data.reason);
    await logAuditEvent({ userId: req.user!.id, action: "APPOINTMENT_NO_SHOW", entityType: "NoShow", entityId: row.id, metadata: parsed.data, ipAddress: req.ip });
    return res.json(row);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
});
