import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { isValidSlug, slugify } from "../src/lib/tenant-host";

/**
 * Legt den ersten Bildungsanbieter an, falls noch keiner existiert.
 * Gedacht für den Single-Modus und für die lokale Entwicklung.
 */
async function main() {
  const name = process.env.ORG_NAME?.trim();
  if (!name) {
    console.log("ORG_NAME ist nicht gesetzt, es wird nichts angelegt.");
    return;
  }

  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  try {
    if ((await prisma.organization.count()) > 0) {
      console.log("Es existiert bereits ein Bildungsanbieter, nichts zu tun.");
      return;
    }
    const slug = process.env.ORG_SLUG?.trim() || slugify(name);
    if (!isValidSlug(slug)) {
      throw new Error(
        `Das Kürzel "${slug}" ist ungültig oder reserviert. Setze ORG_SLUG.`,
      );
    }
    await prisma.organization.create({ data: { name, slug } });
    console.log(`Bildungsanbieter "${name}" mit Kürzel "${slug}" angelegt.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
