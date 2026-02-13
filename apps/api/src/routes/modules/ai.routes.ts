import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../middleware/auth.js";
import { extractStructuredClinicalData, transcribeEncounter } from "../../services/ai.service.js";
import { listAiDrafts, updateAiDraftStatus } from "../../services/ai-draft.service.js";

const transcribeSchema = z.object({
  audioUrl: z.string().min(1),
  language: z.enum(["sk", "en"]).optional()
});

const draftStatusSchema = z.object({
  status: z.enum(["PENDING_REVIEW", "APPROVED", "REJECTED"])
});

export const aiRouter = Router();
aiRouter.use(requireAuth);

aiRouter.post("/encounters/:id/transcribe", async (req, res) => {
  const parsed = transcribeSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  const transcript = await transcribeEncounter({
    encounterId: req.params.id,
    audioUrl: parsed.data.audioUrl,
    language: parsed.data.language
  });

  const extraction = await extractStructuredClinicalData(transcript);
  res.json({ transcript, extraction });
});

aiRouter.get('/drafts', (_req, res) => {
  res.json({ items: listAiDrafts() });
});

aiRouter.patch('/drafts/:id', (req, res) => {
  const parsed = draftStatusSchema.safeParse(req.body);
  if (!parsed.success) return res.status(400).json(parsed.error.flatten());

  try {
    const draft = updateAiDraftStatus(req.params.id, parsed.data.status);
    return res.json(draft);
  } catch (error) {
    return res.status(400).json({ error: (error as Error).message });
  }
});
