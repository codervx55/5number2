import { PrismaClient } from "@prisma/client";

// Next.js dev mode hot-reloads modules, which would otherwise create a new
// PrismaClient (and a new DB connection pool) on every file save. Stashing
// it on `globalThis` keeps a single instance alive across reloads.
const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
