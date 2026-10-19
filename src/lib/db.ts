import "server-only";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

function createClient() {
  const connectionString = process.env.DATABASE_URL ?? "";
  // Neon's serverless driver (WebSocket, pooled) in production; plain TCP `pg`
  // when developing against a local Postgres.
  const isLocal = /@(localhost|127\.0\.0\.1|\[::1\])[:/]/.test(connectionString);
  const adapter = isLocal ? new PrismaPg({ connectionString, max: 5 }) : new PrismaNeon({ connectionString });
  return new PrismaClient({ adapter });
}

// One client per server instance (and across hot reloads in development).
const globalForPrisma = globalThis as unknown as { prisma?: ReturnType<typeof createClient> };

export const db = globalForPrisma.prisma ?? createClient();
globalForPrisma.prisma = db;
