import { Router } from "express";
import { requireAuth } from "../../middleware/auth.js";
import { db } from "../../store/inMemoryDb.js";

export const realtimeRouter = Router();
realtimeRouter.use(requireAuth);

realtimeRouter.get("/events", (req, res) => {
  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const send = () => {
    const payload = {
      timestamp: new Date().toISOString(),
      stats: {
        clients: db.clients.length,
        appointments: db.appointments.length,
        invoices: db.invoices.length,
        lowStock: db.inventory.filter((item) => item.stockOnHand <= item.minStock).length
      }
    };

    res.write(`event: dashboard\n`);
    res.write(`data: ${JSON.stringify(payload)}\n\n`);
  };

  send();
  const interval = setInterval(send, 5000);
  req.on("close", () => clearInterval(interval));
});

realtimeRouter.get("/ws-info", (_req, res) => {
  res.json({ urlPath: "/api/realtime/ws", auth: "query token" });
});
