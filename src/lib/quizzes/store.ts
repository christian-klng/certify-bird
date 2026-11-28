import { Prisma } from "@/generated/prisma/client";
import { db } from "../db";
import { emptyQuiz, type QuizContent } from "./quiz";

// Alle Zugriffe sind auf den Mandanten beschränkt: Eine fremde ID findet nichts.

export function listQuizzes(organizationId: string) {
  return db().quiz.findMany({
    where: { organizationId },
    orderBy: { updatedAt: "desc" },
    select: { id: true, name: true, updatedAt: true, content: true },
  });
}

export function findQuiz(organizationId: string, id: string) {
  return db().quiz.findFirst({ where: { id, organizationId } });
}

export function createQuiz(organizationId: string, name: string) {
  return db().quiz.create({
    data: { organizationId, name, content: emptyQuiz as object },
    select: { id: true },
  });
}

/** Liefert false, wenn das Quiz nicht (mehr) zum Mandanten gehört. */
export async function updateQuiz(
  organizationId: string,
  id: string,
  data: { name: string; content: QuizContent },
): Promise<boolean> {
  const result = await db().quiz.updateMany({
    where: { id, organizationId },
    data: { name: data.name, content: data.content as object },
  });
  return result.count === 1;
}

export async function deleteQuiz(organizationId: string, id: string): Promise<void> {
  await db().quiz.deleteMany({ where: { id, organizationId } });
}

/** Der gespeicherte Inhalt eines Quiz. Er wurde beim Speichern geprüft. */
export function quizContent(row: { content: unknown }): QuizContent {
  return row.content as QuizContent;
}

/** Die Kopie des Quiz in einer Kohorte; null, wenn sie keines verlangt. */
export function issuanceQuiz(issuance: { quiz: unknown }): QuizContent | null {
  return (issuance.quiz as QuizContent | null) ?? null;
}

/** Bedingung für Einträge von Teilnehmenden: Ihre Kohorte verlangt ein Quiz. */
export const withQuiz = { issuance: { quiz: { not: Prisma.DbNull } } } as const;
