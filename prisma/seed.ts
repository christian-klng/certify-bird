import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../src/generated/prisma/client";
import { normalizeEmail } from "../src/lib/auth/tokens";
import { isValidSlug, slugify } from "../src/lib/tenant-host";

/**
 * Richtet den ersten Bildungsanbieter ein. Gedacht für den Single-Modus und
 * für die lokale Entwicklung. Kann beliebig oft laufen:
 * - ORG_NAME: legt den Anbieter an, falls noch keiner existiert.
 * - ADMIN_EMAIL: trägt diese Adresse als Inhaber ein, falls der zuerst
 *   angelegte Anbieter noch niemanden hat, der sich anmelden kann.
 */
async function main() {
  const prisma = new PrismaClient({
    adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
  });
  try {
    let organization = await prisma.organization.findFirst({
      orderBy: { createdAt: "asc" },
    });

    const name = process.env.ORG_NAME?.trim();
    if (!organization && name) {
      const slug = process.env.ORG_SLUG?.trim() || slugify(name);
      if (!isValidSlug(slug)) {
        throw new Error(
          `Das Kürzel "${slug}" ist ungültig oder reserviert. Setze ORG_SLUG.`,
        );
      }
      organization = await prisma.organization.create({ data: { name, slug } });
      console.log(`Bildungsanbieter "${name}" mit Kürzel "${slug}" angelegt.`);
    }
    if (!organization) {
      console.log("Kein Bildungsanbieter vorhanden und ORG_NAME nicht gesetzt: nichts zu tun.");
      return;
    }

    const rawAdmin = process.env.ADMIN_EMAIL?.trim();
    if (!rawAdmin) return;
    const email = normalizeEmail(rawAdmin);
    if (!email) throw new Error(`ADMIN_EMAIL "${rawAdmin}" ist keine gültige E-Mail-Adresse.`);

    const members = await prisma.membership.count({
      where: { organizationId: organization.id },
    });
    if (members > 0) {
      console.log(`"${organization.name}" hat bereits Mitglieder, ADMIN_EMAIL wird nicht eingetragen.`);
      return;
    }
    const user = await prisma.user.upsert({
      where: { email },
      update: {},
      create: { email },
    });
    await prisma.membership.create({
      data: { userId: user.id, organizationId: organization.id, role: "OWNER" },
    });
    console.log(`${email} als Inhaber von "${organization.name}" eingetragen.`);
  } finally {
    await prisma.$disconnect();
  }
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
