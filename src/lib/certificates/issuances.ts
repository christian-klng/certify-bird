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
    orderBy: { createdAt: "desc" },
    select: {
      id: true,
      courseTitle: true,
      issuedOn: true,
      quiz: true,
      template: { select: { name: true } },
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
 * Legt eine Kohorte an: einen Durchgang eines Kurses mit fester Vorlage und,
 * wenn gewünscht, einem Quiz. Die Personen werden nur eingetragen; ein
 * Zertifikat bekommen sie später (siehe issueCertificates) oder, mit Quiz,
 * sobald sie es bestanden haben.
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
      // Vorläufige Kopie; maßgeblich ist der Stand beim ersten Zertifikat (freezeTemplate).
      description: template.description,
      design: template.design as object,
      ...(quiz ? { quizId: quiz.id, quiz: quiz.content as object } : {}),
      candidates: {
        create: input.recipients.map((recipient) => ({
          organizationId: organization.id,
          name: recipient.name,
          email: recipient.email,
        })),
      },
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
 * Trägt weitere Personen in eine Kohorte ein; wer schon dabei ist, wird
 * gemeldet. Ein Zertifikat entsteht dabei noch nicht.
 */
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

  await db().quizCandidate.createMany({
    data: recipients.map((recipient) => ({
      organizationId,
      issuanceId,
      name: recipient.name,
      email: recipient.email,
    })),
  });
  return { ok: true };
}

type Transaction = Parameters<Parameters<ReturnType<typeof db>["$transaction"]>[0]>[0];

/**
 * Hält fest, wie die Vorlage aussieht, sobald das erste Zertifikat einer
 * Kohorte entsteht. Bis dahin wirken Änderungen an der Vorlage noch; danach
 * bleiben alle Zertifikate der Kohorte gleich, auch wenn die Vorlage geändert
 * oder gelöscht wird. Gibt es die Vorlage nicht mehr, bleibt die Kopie vom
 * Anlegen der Kohorte.
 */
export async function freezeTemplate(
  tx: Transaction,
  organizationId: string,
  issuanceId: string,
  issuedOn?: Date,
): Promise<void> {
  const existing = await tx.certificate.count({ where: { issuanceId } });
  if (existing > 0) return;
  const issuance = await tx.issuance.findFirst({
    where: { id: issuanceId, organizationId },
    select: { template: { select: { description: true, design: true } } },
  });
  if (!issuance) return;
  await tx.issuance.update({
    where: { id: issuanceId },
    data: {
      ...(issuance.template
        ? { description: issuance.template.description, design: issuance.template.design as object }
        : {}),
      ...(issuedOn ? { issuedOn } : {}),
    },
  });
}

export type IssueResult =
  | { ok: true; issued: number }
  | { ok: false; reason: "not-found" | "quiz" | "nobody" };

/**
 * Stellt eingetragenen Personen einer Kohorte ihr Zertifikat aus. Das Datum
 * gilt für die ganze Kohorte und lässt sich nur setzen, solange sie noch kein
 * Zertifikat enthält. Kohorten mit Quiz stellen von selbst aus, sobald jemand
 * besteht; hier ist das nicht möglich.
 */
export async function issueCertificates(
  organizationId: string,
  issuanceId: string,
  input: { candidateIds: string[]; issuedOn: Date | null },
): Promise<IssueResult> {
  return db().$transaction(async (tx) => {
    const issuance = await tx.issuance.findFirst({
      where: { id: issuanceId, organizationId },
      select: { id: true, quiz: true },
    });
    if (!issuance) return { ok: false, reason: "not-found" };
    if (issuance.quiz !== null) return { ok: false, reason: "quiz" };

    const candidates = await tx.quizCandidate.findMany({
      where: { issuanceId, organizationId, id: { in: input.candidateIds } },
    });
    if (candidates.length === 0) return { ok: false, reason: "nobody" };

    await freezeTemplate(tx, organizationId, issuanceId, input.issuedOn ?? undefined);
    await tx.certificate.createMany({
      data: candidates.map((candidate) => ({
        organizationId,
        issuanceId,
        recipientName: candidate.name,
        recipientEmail: candidate.email,
      })),
    });
    await tx.quizCandidate.deleteMany({
      where: { issuanceId, id: { in: candidates.map((c) => c.id) } },
    });
    return { ok: true, issued: candidates.length };
  });
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

/** Die gespeicherte Gestaltung einer Kohorte. Sie wurde beim Speichern der Vorlage geprüft. */
export function issuanceDesign(issuance: { design: unknown }): Design {
  return issuance.design as Design;
}
