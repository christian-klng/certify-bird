import { freezeTemplate } from "../certificates/issuances";
import { db } from "../db";
import { gradeQuiz, type QuizContent } from "./quiz";
import { issuanceQuiz, withQuiz } from "./store";

// Teilnehmende sehen genau die Quizzes, zu denen sie beim Mandanten mit ihrer
// E-Mail-Adresse eingetragen sind. Einträge in Kohorten ohne Quiz warten nur
// darauf, dass die Verwaltung ein Zertifikat ausstellt; sie zählen hier nicht.

export function listOwnCandidates(organizationId: string, email: string) {
  return db().quizCandidate.findMany({
    where: { organizationId, email, ...withQuiz },
    orderBy: { createdAt: "desc" },
    include: { issuance: { select: { courseTitle: true, issuerName: true, quiz: true } } },
  });
}

export function findOwnCandidate(organizationId: string, email: string, id: string) {
  return db().quizCandidate.findFirst({
    where: { id, organizationId, email, ...withQuiz },
    include: { issuance: { select: { courseTitle: true, issuerName: true, quiz: true } } },
  });
}

export type AttemptResult =
  /** Den Eintrag gibt es nicht (mehr), etwa weil das Quiz schon bestanden ist. */
  | { kind: "not-found" }
  /** Alle Versuche sind aufgebraucht; dieser wurde nicht gewertet. */
  | { kind: "exhausted" }
  | { kind: "failed"; correct: number; total: number }
  | { kind: "passed" };

/**
 * Wertet einen Versuch aus. Bei Erfolg entsteht das Zertifikat und der
 * Eintrag verschwindet, beides in einem Schritt.
 */
export async function submitAttempt(
  organizationId: string,
  email: string,
  candidateId: string,
  answers: Record<string, string[]>,
): Promise<AttemptResult> {
  return db().$transaction(async (tx) => {
    const where = { id: candidateId, organizationId, email };
    const candidate = await tx.quizCandidate.findFirst({
      where,
      include: { issuance: { select: { quiz: true } } },
    });
    const quiz: QuizContent | null = candidate ? issuanceQuiz(candidate.issuance) : null;
    if (!candidate || !quiz) return { kind: "not-found" };

    // Den Versuch atomar verbuchen: Gleichzeitige Abgaben können die
    // Höchstzahl nicht überschreiten.
    const claimed = await tx.quizCandidate.updateMany({
      where: quiz.maxAttempts === null ? where : { ...where, attempts: { lt: quiz.maxAttempts } },
      data: { attempts: { increment: 1 } },
    });
    if (claimed.count !== 1) {
      const still = await tx.quizCandidate.findFirst({ where, select: { id: true } });
      return still ? { kind: "exhausted" } : { kind: "not-found" };
    }

    const result = gradeQuiz(quiz, answers);
    if (!result.passed) {
      await tx.quizCandidate.update({
        where: { id: candidate.id },
        data: { lastCorrect: result.correct, lastTotal: result.total },
      });
      return { kind: "failed", correct: result.correct, total: result.total };
    }

    await freezeTemplate(tx, organizationId, candidate.issuanceId);
    await tx.certificate.create({
      data: {
        organizationId,
        issuanceId: candidate.issuanceId,
        recipientName: candidate.name,
        recipientEmail: candidate.email,
        // Die Person hat das Quiz selbst bestanden und weiß von ihrem Zertifikat.
        notifiedAt: new Date(),
        quizCorrect: result.correct,
        quizTotal: result.total,
      },
    });
    await tx.quizCandidate.delete({ where: { id: candidate.id } });
    return { kind: "passed" };
  });
}

export async function deleteCandidate(
  organizationId: string,
  issuanceId: string,
  id: string,
): Promise<void> {
  await db().quizCandidate.deleteMany({ where: { id, issuanceId, organizationId } });
}

/** Gibt einer Person ihre Versuche zurück. */
export async function resetAttempts(
  organizationId: string,
  issuanceId: string,
  id: string,
): Promise<void> {
  await db().quizCandidate.updateMany({
    where: { id, issuanceId, organizationId },
    data: { attempts: 0, lastCorrect: null, lastTotal: null },
  });
}
