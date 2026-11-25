import { db } from "../db";
import type { Design, PlaceholderValues } from "./design";
import { formatIssueDate, type Recipient } from "./recipients";

export const MAX_COURSE_TITLE_LENGTH = 200;

// Alle Zugriffe sind auf den Mandanten beschränkt: Eine fremde ID findet nichts.

export function listIssuances(organizationId: string) {
  return db().issuance.findMany({
    where: { organizationId },
    orderBy: [{ issuedOn: "desc" }, { createdAt: "desc" }],
    select: {
      id: true,
      courseTitle: true,
      issuedOn: true,
      _count: { select: { certificates: true } },
    },
  });
}

export function findIssuance(organizationId: string, id: string) {
  return db().issuance.findFirst({
    where: { id, organizationId },
    include: {
      certificates: { orderBy: { recipientName: "asc" } },
      template: { select: { id: true, name: true } },
    },
  });
}

/**
 * Stellt Zertifikate aus: kopiert Gestaltung und Beschreibung aus der Vorlage
 * und legt je Person ein Zertifikat an. Null, wenn es die Vorlage nicht gibt.
 */
export async function createIssuance(
  organization: { id: string; name: string },
  input: { templateId: string; courseTitle: string; issuedOn: Date; recipients: Recipient[] },
): Promise<{ id: string } | null> {
  const template = await db().certificateTemplate.findFirst({
    where: { id: input.templateId, organizationId: organization.id },
  });
  if (!template) return null;

  return db().issuance.create({
    data: {
      organizationId: organization.id,
      templateId: template.id,
      courseTitle: input.courseTitle,
      issuerName: organization.name,
      issuedOn: input.issuedOn,
      description: template.description,
      design: template.design as object,
      certificates: {
        create: input.recipients.map((recipient) => ({
          organizationId: organization.id,
          recipientName: recipient.name,
          recipientEmail: recipient.email,
        })),
      },
    },
    select: { id: true },
  });
}

export type AddResult =
  | { ok: true }
  | { ok: false; reason: "not-found" }
  | { ok: false; reason: "duplicates"; emails: string[] };

/** Ergänzt eine Ausstellung um weitere Personen; wer schon eines hat, wird gemeldet. */
export async function addRecipients(
  organizationId: string,
  issuanceId: string,
  recipients: Recipient[],
): Promise<AddResult> {
  const issuance = await db().issuance.findFirst({
    where: { id: issuanceId, organizationId },
    select: { id: true },
  });
  if (!issuance) return { ok: false, reason: "not-found" };

  const existing = await db().certificate.findMany({
    where: { issuanceId, recipientEmail: { in: recipients.map((r) => r.email) } },
    select: { recipientEmail: true },
  });
  if (existing.length > 0) {
    return { ok: false, reason: "duplicates", emails: existing.map((c) => c.recipientEmail) };
  }

  await db().certificate.createMany({
    data: recipients.map((recipient) => ({
      organizationId,
      issuanceId,
      recipientName: recipient.name,
      recipientEmail: recipient.email,
    })),
  });
  return { ok: true };
}

export async function deleteIssuance(organizationId: string, id: string): Promise<void> {
  await db().issuance.deleteMany({ where: { id, organizationId } });
}

export async function deleteCertificate(
  organizationId: string,
  issuanceId: string,
  id: string,
): Promise<void> {
  await db().certificate.deleteMany({ where: { id, issuanceId, organizationId } });
}

/** Die Werte, die auf dem Zertifikat einer Person stehen. */
export function certificateValues(
  issuance: { courseTitle: string; issuerName: string; issuedOn: Date },
  recipientName: string,
): PlaceholderValues {
  return {
    name: recipientName,
    kurs: issuance.courseTitle,
    datum: formatIssueDate(issuance.issuedOn),
    anbieter: issuance.issuerName,
  };
}

/** Die gespeicherte Gestaltung einer Ausstellung. Sie wurde beim Speichern der Vorlage geprüft. */
export function issuanceDesign(issuance: { design: unknown }): Design {
  return issuance.design as Design;
}
