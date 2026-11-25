import { describe, expect, it } from "vitest";
import {
  attemptsLeft,
  checkQuiz,
  gradeQuiz,
  neededCorrect,
  publicQuestions,
  type QuizContent,
} from "./quiz";

const draft = {
  intro: "  Viel Erfolg!  ",
  passPercent: 50,
  maxAttempts: null,
  questions: [
    {
      text: " Was ist 2 + 2? ",
      options: [
        { text: "3", correct: false },
        { text: " 4 ", correct: true },
      ],
    },
    {
      text: "Welche Zahlen sind gerade?",
      options: [
        { text: "2", correct: true },
        { text: "3" },
        { text: "4", correct: true },
      ],
    },
  ],
};

function checked(value: unknown = draft): QuizContent {
  const result = checkQuiz(value);
  if (!result.ok) throw new Error(result.error);
  return result.content;
}

describe("checkQuiz", () => {
  it("räumt Texte auf und vergibt eigene Kennungen", () => {
    const content = checked({
      ...draft,
      questions: draft.questions.map((q) => ({ ...q, id: "<script>", extra: 1 })),
    });
    expect(content.intro).toBe("Viel Erfolg!");
    expect(content.questions.map((q) => q.id)).toEqual(["q1", "q2"]);
    expect(content.questions[0]).toEqual({
      id: "q1",
      text: "Was ist 2 + 2?",
      options: [
        { id: "q1a1", text: "3", correct: false },
        { id: "q1a2", text: "4", correct: true },
      ],
    });
  });

  it.each([
    ["kein Objekt", null],
    ["keine Fragen", { ...draft, questions: [] }],
    ["Bestehensgrenze 0", { ...draft, passPercent: 0 }],
    ["Bestehensgrenze als Text", { ...draft, passPercent: "50" }],
    ["null Versuche", { ...draft, maxAttempts: 0 }],
    ["leerer Fragetext", { ...draft, questions: [{ ...draft.questions[0], text: " " }] }],
    [
      "nur eine Antwort",
      { ...draft, questions: [{ text: "?", options: [{ text: "a", correct: true }] }] },
    ],
    [
      "leere Antwort",
      {
        ...draft,
        questions: [{ text: "?", options: [{ text: "a", correct: true }, { text: "" }] }],
      },
    ],
    [
      "keine richtige Antwort",
      { ...draft, questions: [{ text: "?", options: [{ text: "a" }, { text: "b" }] }] },
    ],
    [
      "zu viele Fragen",
      { ...draft, questions: Array.from({ length: 51 }, () => draft.questions[0]) },
    ],
  ])("lehnt ab: %s", (_name, value) => {
    expect(checkQuiz(value).ok).toBe(false);
  });
});

describe("publicQuestions", () => {
  it("verrät die Lösung nicht", () => {
    const questions = publicQuestions(checked());
    expect(JSON.stringify(questions)).not.toContain("correct");
    expect(questions.map((q) => q.multiple)).toEqual([false, true]);
  });
});

describe("gradeQuiz", () => {
  const content = checked();

  it("zählt eine Frage nur bei genau den richtigen Antworten", () => {
    expect(gradeQuiz(content, { q1: ["q1a2"], q2: ["q2a1", "q2a3"] })).toEqual({
      correct: 2,
      total: 2,
      passed: true,
    });
    // Eine richtige fehlt, bei der anderen ist eine falsche dabei.
    expect(gradeQuiz(content, { q1: ["q1a1", "q1a2"], q2: ["q2a1"] }).correct).toBe(0);
  });

  it("wertet fehlende und unbekannte Antworten als falsch", () => {
    expect(gradeQuiz(content, {})).toEqual({ correct: 0, total: 2, passed: false });
    expect(gradeQuiz(content, { q1: ["gibt-es-nicht"] }).correct).toBe(0);
  });

  it("besteht genau an der Grenze", () => {
    expect(gradeQuiz(content, { q1: ["q1a2"] }).passed).toBe(true);
    expect(gradeQuiz({ ...content, passPercent: 51 }, { q1: ["q1a2"] }).passed).toBe(false);
  });
});

describe("attemptsLeft und neededCorrect", () => {
  const content = checked();

  it("rechnet die verbleibenden Versuche", () => {
    expect(attemptsLeft(content, 7)).toBeNull();
    expect(attemptsLeft({ ...content, maxAttempts: 3 }, 1)).toBe(2);
    expect(attemptsLeft({ ...content, maxAttempts: 3 }, 5)).toBe(0);
  });

  it("rundet die nötigen richtigen Antworten auf", () => {
    expect(neededCorrect(content)).toBe(1);
    expect(neededCorrect({ ...content, passPercent: 51 })).toBe(2);
  });
});
