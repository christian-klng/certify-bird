import { db } from "../db";
import type { Design, PlaceholderValues } from "./design";
import type { QuizContent } from "../quizzes/quiz";
import { quizContent } from "../quizzes/store";
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
      _count: { select: { certificates: true, candidates: true } },
    },
  });
}

export function findIssuance(organizationId: string, id: string) {
  return db().issuance.findFirst({
    where: { id, organizationId },
    include: {
      certificates: { orderBy: { recipientName: "asc" } },
      candidates: { orderBy: { name: "asc" } },
      quizRef: { select: { id: true, name: true } },
      template: { select: { id: true, name: true } },
    },
  });
}

export type CreateResult =
  | { ok: true; id: string }
  | { ok: false; reason: "no-template" | "no-quiz" | "empty-quiz" };

/**
 * Stellt Zertifikate aus: kopiert Gestaltung und Beschreibung aus der Vorlage
 * und legt je Person ein Zertifikat an. Mit Quiz wird auch dieses kopiert, und
 * die Personen bekommen ihr Zertifikat erst, wenn sie es bestanden haben.
 */
export async function createIssuance(
  organization: { id: string; name: string },
  input: {
    templateId: string;
    quizId: string | null;
    courseTitle: string;
    issuedOn: Date;
    recipients: Recipient[];
  },
): Promise<CreateResult> {
  const template = await db().certificateTemplate.findFirst({
    where: { id: input.templateId, organizationId: organization.id },
  });
  if (!template) return { ok: false, reason: "no-template" };

  let quiz: { id: string; content: QuizContent } | null = null;
  if (input.quizId) {
    const found = await db().quiz.findFirst({
      where: { id: input.quizId, organizationId: organization.id },
    });
    if (!found) return { ok: false, reason: "no-quiz" };
    quiz = { id: found.id, content: quizContent(found) };
    if (quiz.content.questions.length === 0) return { ok: false, reason: "empty-quiz" };
  }

  const issuance = await db().issuance.create({
    data: {
      organizationId: organization.id,
      templateId: template.id,
      courseTitle: input.courseTitle,
      issuerName: organization.name,
      issuedOn: input.issuedOn,
      description: template.description,
      design: template.design as object,
      ...(quiz
        ? {
            quizId: quiz.id,
            quiz: quiz.content as object,
            candidates: {
              create: input.recipients.map((recipient) => ({
                organizationId: organization.id,
                name: recipient.name,
                email: recipient.email,
              })),
            },
          }
        : {
            certificates: {
              create: input.recipients.map((recipient) => ({
                organizationId: organization.id,
                recipientName: recipient.name,
                recipientEmail: recipient.email,
              })),
            },
          }),
    },
    select: { id: true },
  });
  return { ok: true, id: issuance.id };
}

export type AddResult =
  | { ok: true }
  | { ok: false; reason: "not-found" }
  | { ok: false; reason: "duplicates"; emails: string[] };

/**
 * Ergänzt eine Ausstellung um weitere Personen; wer schon dabei ist, wird
 * gemeldet. Verlangt die Ausstellung ein Quiz, müssen sie es erst bestehen.
 */
export async function addRecipients(
  organizationId: string,
  issuanceId: string,
  recipients: Recipient[],
): Promise<AddResult> {
  const issuance = await db().issuance.findFirst({
    where: { id: issuanceId, organizationId },
    select: { id: true, quiz: true },
  });
  if (!issuance) return { ok: false, reason: "not-found" };

  const emails = recipients.map((r) => r.email);
  const [certificates, candidates] = await Promise.all([
    db().certificate.findMany({
      where: { issuanceId, recipientEmail: { in: emails } },
      select: { recipientEmail: true },
    }),
    db().quizCandidate.findMany({
      where: { issuanceId, email: { in: emails } },
      select: { email: true },
    }),
  ]);
  const existing = [...certificates.map((c) => c.recipientEmail), ...candidates.map((c) => c.email)];
  if (existing.length > 0) return { ok: false, reason: "duplicates", emails: existing };

  if (issuance.quiz) {
    await db().quizCandidate.createMany({
      data: recipients.map((recipient) => ({
        organizationId,
        issuanceId,
        name: recipient.name,
        email: recipient.email,
      })),
    });
  } else {
    await db().certificate.createMany({
      data: recipients.map((recipient) => ({
        organizationId,
        issuanceId,
        recipientName: recipient.name,
        recipientEmail: recipient.email,
      })),
    });
  }
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
