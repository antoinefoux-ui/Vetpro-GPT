import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.js";
import { requirePermission } from "../../middleware/permissions.js";
import { getClientById, getClientTimeline, createClient, createPet, listClients } from "../../services/crm.service.js";
import { logAuditEvent } from "../../services/audit.service.js";

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
