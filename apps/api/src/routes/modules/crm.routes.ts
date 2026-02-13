import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.js";
import { requirePermission } from "../../middleware/permissions.js";
import { logAuditEvent } from "../../services/audit.service.js";
import { createImaging, createLab, createSurgery, createVaccine, listClinicalByPet } from "../../services/clinical.service.js";
import { getClientById, getClientTimeline, createClient, createPet, listClients } from "../../services/crm.service.js";

const clientSchema = z.object({
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  email: z.string().email().optional(),
  phone: z.string().min(6)
});

const petSchema = z.object({
  clientId: z.string().min(1),
  name: z.string().min(1),
  species: z.string().min(1),
  breed: z.string().optional(),
  weightKg: z.number().positive().optional()
});

const vaccineSchema = z.object({
  petId: z.string().min(1),
  vaccineName: z.string().min(1),
  administeredAt: z.string().datetime(),
  dueAt: z.string().datetime().optional(),
  batchNumber: z.string().optional(),
  veterinarianId: z.string().optional(),
  notes: z.string().optional()
});

const labSchema = z.object({
  petId: z.string().min(1),
  testType: z.string().min(1),
  resultSummary: z.string().min(1),
  abnormal: z.boolean(),
  recordedAt: z.string().datetime()
});

const imagingSchema = z.object({
  petId: z.string().min(1),
  modality: z.enum(["XRAY", "ULTRASOUND", "CT", "MRI"]),
  findings: z.string().min(1),
  recordedAt: z.string().datetime()
});

const surgerySchema = z.object({
  petId: z.string().min(1),
  procedureName: z.string().min(1),
  surgeonId: z.string().optional(),
  startedAt: z.string().datetime(),
  endedAt: z.string().datetime().optional(),
  notes: z.string().optional()
});

export const crmRouter = Router();
crmRouter.use(requireAuth);

crmRouter.get("/clients", requirePermission("crm.read"), (_req, res) => {
  res.json({ items: listClients() });
});

crmRouter.get("/clients/:id", requirePermission("crm.read"), (req, res) => {
  const client = getClientById(req.params.id);
  if (!client) return res.status(404).json({ error: "Client not found" });
  return res.json(client);
});

crmRouter.get("/clients/:id/timeline", requirePermission("crm.read"), (req, res) => {
  try {
    return res.json({ items: getClientTimeline(req.params.id) });
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
});

crmRouter.post("/clients", requirePermission("crm.write"), async (req, res) => {
  const parsed = clientSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  const client = createClient(parsed.data);
  await logAuditEvent({
    userId: req.user!.id,
    action: "CLIENT_CREATED",
    entityType: "Client",
    entityId: client.id,
    metadata: { fullName: `${client.firstName} ${client.lastName}` },
    ipAddress: req.ip
  });
  return res.status(201).json(client);
});

crmRouter.post("/pets", requirePermission("crm.write"), async (req, res) => {
  const parsed = petSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  try {
    const pet = createPet(parsed.data);
    await logAuditEvent({
      userId: req.user!.id,
      action: "PET_CREATED",
      entityType: "Pet",
      entityId: pet.id,
      metadata: { name: pet.name, species: pet.species, clientId: pet.clientId },
      ipAddress: req.ip
    });
    return res.status(201).json(pet);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
});

crmRouter.get("/pets/:petId/medical", requirePermission("crm.read"), (req, res) => {
  try {
    return res.json(listClinicalByPet(req.params.petId));
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
});

crmRouter.post("/medical/vaccines", requirePermission("crm.write"), async (req, res) => {
  const parsed = vaccineSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  try {
    const row = createVaccine(parsed.data);
    await logAuditEvent({ userId: req.user!.id, action: "VACCINE_RECORDED", entityType: "Vaccine", entityId: row.id, ipAddress: req.ip });
    return res.status(201).json(row);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
});

crmRouter.post("/medical/labs", requirePermission("crm.write"), async (req, res) => {
  const parsed = labSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  try {
    const row = createLab(parsed.data);
    await logAuditEvent({ userId: req.user!.id, action: "LAB_RECORDED", entityType: "Lab", entityId: row.id, ipAddress: req.ip });
    return res.status(201).json(row);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
});

crmRouter.post("/medical/imaging", requirePermission("crm.write"), async (req, res) => {
  const parsed = imagingSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  try {
    const row = createImaging(parsed.data);
    await logAuditEvent({ userId: req.user!.id, action: "IMAGING_RECORDED", entityType: "Imaging", entityId: row.id, ipAddress: req.ip });
    return res.status(201).json(row);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
});

crmRouter.post("/medical/surgeries", requirePermission("crm.write"), async (req, res) => {
  const parsed = surgerySchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());
  try {
    const row = createSurgery(parsed.data);
    await logAuditEvent({ userId: req.user!.id, action: "SURGERY_RECORDED", entityType: "Surgery", entityId: row.id, ipAddress: req.ip });
    return res.status(201).json(row);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
});
