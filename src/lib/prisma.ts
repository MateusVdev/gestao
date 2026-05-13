import { PrismaClient } from "@prisma/client";

/**
 * PrismaClient Singleton for Next.js
 * Prevents multiple instances of Prisma Client in development mode
 * caused by Hot Module Replacement (HMR).
 */

const prismaClientSingleton = () => {
  return new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
};

type PrismaClientSingleton = ReturnType<typeof prismaClientSingleton>;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClientSingleton | undefined;
};

export const prisma = globalForPrisma.prisma ?? prismaClientSingleton();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}

export function isDatabaseConfigured() {
  return Boolean(process.env.DATABASE_URL);
}
