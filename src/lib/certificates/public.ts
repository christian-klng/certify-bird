import { db } from "../db";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;

/** Ob es unter dieser ID beim Mandanten ein veröffentlichtes Zertifikat gibt. */
export async function isPublishedCertificate(organizationId: string, id: string): Promise<boolean> {
  if (!UUID.test(id)) return false;
  const found = await db().certificate.findFirst({
    where: { id, organizationId, publishedAt: { not: null } },
    select: { id: true },
  });
  return found !== null;
}

/** Das veröffentlichte Zertifikat samt Ausstellung; null ohne Einwilligung. */
export function findPublishedCertificate(organizationId: string, id: string) {
  if (!UUID.test(id)) return Promise.resolve(null);
  return db().certificate.findFirst({
    where: { id, organizationId, publishedAt: { not: null } },
    include: { issuance: true },
  });
}
