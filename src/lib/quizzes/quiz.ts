// Inhalt und Auswertung eines Quiz. Ohne Datenbank, damit es sich testen lässt.

export type QuizOption = { id: string; text: string; correct: boolean };
export type QuizQuestion = { id: string; text: string; options: QuizOption[] };

/** Was ein Quiz ausmacht; so liegt es in der Datenbank und in der Kopie einer Kohorte. */
export type QuizContent = {
  /** Kurzer Text, den Teilnehmende vor den Fragen lesen. */
  intro: string;
  /** Anteil richtig beantworteter Fragen in Prozent, ab dem das Quiz bestanden ist. */
  passPercent: number;
  /** Höchstzahl der Versuche; null heißt beliebig viele. */
  maxAttempts: number | null;
  questions: QuizQuestion[];
};

export const MAX_QUESTIONS = 50;
export const MIN_OPTIONS = 2;
export const MAX_OPTIONS = 8;
export const MAX_QUESTION_LENGTH = 1000;
export const MAX_OPTION_LENGTH = 500;
export const MAX_INTRO_LENGTH = 2000;
export const MAX_ATTEMPTS_LIMIT = 20;

/** Inhalt eines neu angelegten Quiz: noch ohne Fragen. */
export const emptyQuiz: QuizContent = {
  intro: "",
  passPercent: 80,
  maxAttempts: null,
  questions: [],
};

export type QuizCheck = { ok: true; content: QuizContent } | { ok: false; error: string };

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

/**
 * Prüft einen Quiz-Inhalt aus dem Editor und bringt ihn in die gespeicherte
 * Form. Die Kennungen der Fragen und Antworten werden hier neu vergeben; was
 * der Browser schickt, spielt dafür keine Rolle.
 */
export function checkQuiz(value: unknown): QuizCheck {
  const fail = (error: string): QuizCheck => ({ ok: false, error });
  if (!isRecord(value)) return fail("Das Quiz ist unlesbar.");

  const intro = typeof value.intro === "string" ? value.intro.trim() : "";
  if (intro.length > MAX_INTRO_LENGTH) return fail("Die Einleitung ist zu lang.");

  const passPercent = value.passPercent;
  if (
    typeof passPercent !== "number" ||
    !Number.isInteger(passPercent) ||
    passPercent < 1 ||
    passPercent > 100
  ) {
    return fail("Die Bestehensgrenze muss zwischen 1 und 100 Prozent liegen.");
  }

  const maxAttempts = value.maxAttempts ?? null;
  if (
    maxAttempts !== null &&
    (typeof maxAttempts !== "number" ||
      !Number.isInteger(maxAttempts) ||
      maxAttempts < 1 ||
      maxAttempts > MAX_ATTEMPTS_LIMIT)
  ) {
    return fail(`Die Zahl der Versuche muss zwischen 1 und ${MAX_ATTEMPTS_LIMIT} liegen oder leer sein.`);
  }

  if (!Array.isArray(value.questions) || value.questions.length === 0) {
    return fail("Das Quiz braucht mindestens eine Frage.");
  }
  if (value.questions.length > MAX_QUESTIONS) {
    return fail(`Ein Quiz kann höchstens ${MAX_QUESTIONS} Fragen haben.`);
  }

  const questions: QuizQuestion[] = [];
  for (const [index, raw] of value.questions.entries()) {
    const label = `Frage ${index + 1}`;
    if (!isRecord(raw)) return fail(`${label} ist unlesbar.`);
    const text = typeof raw.text === "string" ? raw.text.trim() : "";
    if (!text) return fail(`${label}: Der Fragetext fehlt.`);
    if (text.length > MAX_QUESTION_LENGTH) return fail(`${label}: Der Fragetext ist zu lang.`);

    if (!Array.isArray(raw.options)) return fail(`${label} ist unlesbar.`);
    if (raw.options.length < MIN_OPTIONS || raw.options.length > MAX_OPTIONS) {
      return fail(`${label} braucht ${MIN_OPTIONS} bis ${MAX_OPTIONS} Antworten.`);
    }
    const options: QuizOption[] = [];
    for (const [optionIndex, rawOption] of raw.options.entries()) {
      if (!isRecord(rawOption)) return fail(`${label} ist unlesbar.`);
      const optionText = typeof rawOption.text === "string" ? rawOption.text.trim() : "";
      if (!optionText) return fail(`${label}: Antwort ${optionIndex + 1} ist leer.`);
      if (optionText.length > MAX_OPTION_LENGTH) {
        return fail(`${label}: Antwort ${optionIndex + 1} ist zu lang.`);
      }
      options.push({
        id: `q${index + 1}a${optionIndex + 1}`,
        text: optionText,
        correct: rawOption.correct === true,
      });
    }
    if (!options.some((option) => option.correct)) {
      return fail(`${label}: Bitte markiere mindestens eine richtige Antwort.`);
    }
    questions.push({ id: `q${index + 1}`, text, options });
  }

  return { ok: true, content: { intro, passPercent, maxAttempts, questions } };
}

/** Eine Frage, wie Teilnehmende sie sehen: ohne die Lösung. */
export type PublicQuestion = {
  id: string;
  text: string;
  /** Ob mehrere Antworten richtig sind und angekreuzt werden können. */
  multiple: boolean;
  options: { id: string; text: string }[];
};

export function publicQuestions(content: QuizContent): PublicQuestion[] {
  return content.questions.map((question) => ({
    id: question.id,
    text: question.text,
    multiple: question.options.filter((option) => option.correct).length > 1,
    options: question.options.map((option) => ({ id: option.id, text: option.text })),
  }));
}

export type QuizResult = { correct: number; total: number; passed: boolean };

/**
 * Wertet einen Versuch aus. `answers` nennt je Frage die angekreuzten
 * Antworten. Eine Frage zählt nur, wenn genau die richtigen angekreuzt sind.
 */
export function gradeQuiz(content: QuizContent, answers: Record<string, string[]>): QuizResult {
  let correct = 0;
  for (const question of content.questions) {
    const chosen = new Set(answers[question.id] ?? []);
    const right = question.options.every((option) => chosen.has(option.id) === option.correct);
    if (right) correct += 1;
  }
  const total = content.questions.length;
  return { correct, total, passed: total > 0 && correct * 100 >= content.passPercent * total };
}

/** Wie viele Versuche noch möglich sind; null heißt beliebig viele. */
export function attemptsLeft(content: QuizContent, attempts: number): number | null {
  return content.maxAttempts === null ? null : Math.max(0, content.maxAttempts - attempts);
}

/** Wie viele richtige Antworten zum Bestehen nötig sind. */
export function neededCorrect(content: QuizContent): number {
  return Math.ceil((content.passPercent * content.questions.length) / 100);
}
