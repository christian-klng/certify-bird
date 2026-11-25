import { db } from "../db";
import { CONSENT_VERSION } from "./consent";

// Teilnehmende sehen genau die Zertifikate, die beim Mandanten auf ihre
// E-Mail-Adresse ausgestellt wurden.

export function listOwnCertificates(organizationId: string, email: string) {
  return db().certificate.findMany({
    where: { organizationId, recipientEmail: email },
    orderBy: { issuance: { issuedOn: "desc" } },
    include: { issuance: { select: { courseTitle: true, issuedOn: true, issuerName: true } } },
  });
}

export function findOwnCertificate(organizationId: string, email: string, id: string) {
  return db().certificate.findFirst({
    where: { id, organizationId, recipientEmail: email },
    include: { issuance: true },
  });
}

/**
 * Veröffentlicht oder verbirgt ein eigenes Zertifikat und hält die
 * Einwilligung oder den Widerruf fest. False, wenn es nicht der Person gehört.
 */
export async function setPublished(
  organizationId: string,
  email: string,
  id: string,
  published: boolean,
): Promise<boolean> {
  return db().$transaction(async (tx) => {
    const changed = await tx.certificate.updateMany({
      // Nur bei echter Änderung, damit der Nachweis keine Doppelten enthält.
      where: {
        id,
        organizationId,
        recipientEmail: email,
        publishedAt: published ? null : { not: null },
      },
      data: { publishedAt: published ? new Date() : null },
    });
    if (changed.count === 1) {
      await tx.consentEvent.create({
        data: {
          certificateId: id,
          action: published ? "GRANTED" : "WITHDRAWN",
          textVersion: CONSENT_VERSION,
        },
      });
      return true;
    }
    const own = await tx.certificate.findFirst({
      where: { id, organizationId, recipientEmail: email },
      select: { id: true },
    });
    return own !== null;
  });
}
