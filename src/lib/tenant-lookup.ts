import { db } from "./db";
import type { TenantLookup } from "./tenant";

const select = {
  id: true,
  name: true,
  slug: true,
  customDomain: true,
  customDomainVerifiedAt: true,
} as const;

/** Die Mandantensuche gegen die echte Datenbank. */
export const tenantLookup: TenantLookup = {
  findFirst: () =>
    db().organization.findFirst({ select, orderBy: { createdAt: "asc" } }),

  async findBySlug(slug) {
    const current = await db().organization.findUnique({
      where: { slug },
      select,
    });
    if (current) return current;
    const retired = await db().retiredSlug.findUnique({
      where: { slug },
      select: { organization: { select } },
    });
    return retired?.organization ?? null;
  },

  findByVerifiedCustomDomain: (domain) =>
    db().organization.findFirst({
      where: { customDomain: domain, customDomainVerifiedAt: { not: null } },
      select,
    }),
};
