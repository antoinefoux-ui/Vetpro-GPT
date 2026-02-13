import { createHash } from "node:crypto";
import { createServer } from "node:http";
import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env.js";
import { apiRouter } from "./routes/index.js";
import { authenticateToken, registerUser } from "./services/auth.service.js";
import { db } from "./store/inMemoryDb.js";

const app = express();
app.use(helmet());
app.use(cors());
app.use(express.json({ limit: "10mb" }));

(async () => {
  if (db.users.length === 0) {
    await registerUser({ fullName: "System Admin", email: "admin@vetpro.local", password: "password123", role: "ADMIN" });
  }
})();

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "vetpro-api", persistenceMode: env.PERSISTENCE_MODE });
});

app.use("/api", apiRouter);
app.use((_req, res) => res.status(404).json({ error: "Not found" }));

const server = createServer(app);

server.on("upgrade", async (req, socket) => {
  const url = new URL(req.url ?? "", `http://${req.headers.host}`);
  if (url.pathname !== "/api/realtime/ws") {
    socket.destroy();
    return;
  }

  const token = url.searchParams.get("token");
  if (!token || !(await authenticateToken(token))) {
    socket.write("HTTP/1.1 401 Unauthorized\r\n\r\n");
    socket.destroy();
    return;
  }

  const key = req.headers["sec-websocket-key"];
  if (!key || Array.isArray(key)) {
    socket.write("HTTP/1.1 400 Bad Request\r\n\r\n");
    socket.destroy();
    return;
  }

  const accept = createHash("sha1").update(`${key}258EAFA5-E914-47DA-95CA-C5AB0DC85B11`).digest("base64");
  socket.write(
    "HTTP/1.1 101 Switching Protocols\r\n" +
      "Upgrade: websocket\r\n" +
      "Connection: Upgrade\r\n" +
      `Sec-WebSocket-Accept: ${accept}\r\n\r\n`
  );

  const sendText = (message: string) => {
    const payload = Buffer.from(message);
    const frame = Buffer.alloc(2 + payload.length);
    frame[0] = 0x81;
    frame[1] = payload.length;
    payload.copy(frame, 2);
    socket.write(frame);
  };

  const interval = setInterval(() => sendText(JSON.stringify({ type: "heartbeat", at: new Date().toISOString() })), 15000);
  sendText(JSON.stringify({ type: "connected", protocol: "ws", at: new Date().toISOString() }));

  socket.on("close", () => clearInterval(interval));
  socket.on("error", () => clearInterval(interval));
});

server.listen(env.PORT, () => {
  console.log(`VetPro API listening on port ${env.PORT}`);
});
