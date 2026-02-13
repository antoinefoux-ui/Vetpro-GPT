import { PrismaClient } from "@prisma/client";

let prismaClient: PrismaClient | null = null;

export function prisma(): PrismaClient {
  if (!prismaClient) prismaClient = new PrismaClient();
  return prismaClient;
}
