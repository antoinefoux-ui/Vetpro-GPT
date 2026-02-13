import dotenv from "dotenv";
import { z } from "zod";

dotenv.config();

const EnvSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  PORT: z.coerce.number().default(4000),
  DATABASE_URL: z.string().min(1),
  JWT_SECRET: z.string().min(16).default("replace-with-a-secure-secret"),
  JWT_ISSUER: z.string().default("vetpro-api"),
  JWT_AUDIENCE: z.string().default("vetpro-web"),
  PERSISTENCE_MODE: z.enum(["memory", "postgres"]).default("memory"),
  GOOGLE_OAUTH_CLIENT_ID: z.string().optional()
});

export const env = EnvSchema.parse(process.env);
