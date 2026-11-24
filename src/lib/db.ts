import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";

function createClient(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL ist nicht gesetzt.");
  }
  return new PrismaClient({ adapter: new PrismaPg({ connectionString }) });
}

// Im Entwicklungsmodus lädt Next.js Module neu; ohne diesen Zwischenspeicher
// entstünde bei jedem Neuladen ein weiterer Verbindungspool.
const globalForDb = globalThis as unknown as { prisma?: PrismaClient };

/** Liefert den Datenbank-Client. Verbindet erst beim ersten Aufruf. */
export function db(): PrismaClient {
  globalForDb.prisma ??= createClient();
  return globalForDb.prisma;
}
