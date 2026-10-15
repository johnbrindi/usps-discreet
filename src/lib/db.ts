import "server-only";
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    // Generous limits: interactive transactions make several round-trips to a remote database.
    transactionOptions: { maxWait: 10_000, timeout: 15_000 },
  });

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = db;
