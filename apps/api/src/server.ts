import cors from "cors";
import express from "express";
import helmet from "helmet";
import { env } from "./config/env.js";
import { apiRouter } from "./routes/index.js";
import { registerUser } from "./services/auth.service.js";
import { db } from "./store/inMemoryDb.js";

const app = express();

app.use(helmet());

// Configure CORS with frontend URL
app.use(cors({
  origin: [
    'http://localhost:5173',
    'http://localhost:3000',
    env.FRONTEND_URL || '*'
  ],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));

app.use(express.json({ limit: "10mb" }));

if (db.users.length === 0) {
  registerUser({
    fullName: "System Admin",
    email: "admin@vetpro.local",
    password: "password123",
    role: "ADMIN"
  });
}

app.get("/health", (_req, res) => {
  res.json({ status: "ok", service: "vetpro-api" });
});

app.use("/api", apiRouter);

app.use((_req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.listen(env.PORT, '0.0.0.0', () => {
  console.log(`VetPro API listening on port ${env.PORT}`);
  console.log(`Environment: ${process.env.NODE_ENV || 'development'}`);
  console.log(`Frontend URL: ${env.FRONTEND_URL || 'not set'}`);
});
