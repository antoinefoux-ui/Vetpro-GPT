import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.js";
import { requirePermission } from "../../middleware/permissions.js";
import { assignAppointmentResources, createAppointment, listAppointments, updateAppointmentStatus } from "../../services/scheduling.service.js";
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

export const appointmentRouter = Router();
appointmentRouter.use(requireAuth);

appointmentRouter.get("/calendar", requirePermission("schedule.read"), (_req, res) => {
  res.json({ items: listAppointments() });
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
