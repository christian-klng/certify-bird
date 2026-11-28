"use client";

import { useEffect, useState } from "react";
import { MAX_NAME_LENGTH } from "@/lib/certificates/design";
import {
  MAX_ATTEMPTS_LIMIT,
  MAX_INTRO_LENGTH,
  MAX_OPTION_LENGTH,
  MAX_OPTIONS,
  MAX_QUESTION_LENGTH,
  MAX_QUESTIONS,
  MIN_OPTIONS,
  type QuizContent,
} from "@/lib/quizzes/quiz";

type Status = { tone: "info" | "error"; text: string } | null;

// Im Editor haben Fragen und Antworten eigene Schlüssel, damit Eingabefelder
// beim Löschen und Verschieben ihren Inhalt behalten. Gespeichert werden sie nicht.
type DraftOption = { key: number; text: string; correct: boolean };
type DraftQuestion = { key: number; text: string; options: DraftOption[] };

// Fortlaufend über die ganze Seite; die Werte selbst bedeuten nichts.
let nextKey = 1;
const newKey = () => nextKey++;
const blankQuestion = (): DraftQuestion => ({
  key: newKey(),
  text: "",
  options: [
    { key: newKey(), text: "", correct: false },
    { key: newKey(), text: "", correct: false },
  ],
});

const input =
  "block w-full rounded-md border border-border bg-background px-3 py-2 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/30";
const smallButton =
  "rounded-md border border-border px-3 py-1.5 text-sm hover:bg-primary/10 disabled:opacity-50";
const linkButton =
  "text-sm text-primary-strong underline underline-offset-2 hover:no-underline disabled:text-muted disabled:no-underline";

/** Editor für ein Quiz: Name, Einstellungen und die Fragen mit ihren Antworten. */
export function QuizEditor(props: { id: string; name: string; content: QuizContent }) {
  const [name, setName] = useState(props.name);
  const [intro, setIntro] = useState(props.content.intro);
  const [passPercent, setPassPercent] = useState(String(props.content.passPercent));
  const [maxAttempts, setMaxAttempts] = useState(
    props.content.maxAttempts === null ? "" : String(props.content.maxAttempts),
  );
  const [questions, setQuestions] = useState<DraftQuestion[]>(() =>
    props.content.questions.length === 0
      ? [blankQuestion()]
      : props.content.questions.map((question) => ({
          key: newKey(),
          text: question.text,
          options: question.options.map((option) => ({
            key: newKey(),
            text: option.text,
            correct: option.correct,
          })),
        })),
  );
  const [dirty, setDirty] = useState(false);
  const [busy, setBusy] = useState(false);
  const [status, setStatus] = useState<Status>(null);

  // Warnung beim Verlassen der Seite mit ungespeicherten Änderungen.
  useEffect(() => {
    if (!dirty) return;
    const warn = (event: BeforeUnloadEvent) => event.preventDefault();
    window.addEventListener("beforeunload", warn);
    return () => window.removeEventListener("beforeunload", warn);
  }, [dirty]);

  function change<T>(setter: (value: T) => void) {
    return (value: T) => {
      setter(value);
      setDirty(true);
      setStatus(null);
    };
  }
  const changeQuestions = (update: (current: DraftQuestion[]) => DraftQuestion[]) => {
    setQuestions(update);
    setDirty(true);
    setStatus(null);
  };
  const changeQuestion = (key: number, update: (question: DraftQuestion) => DraftQuestion) =>
    changeQuestions((current) => current.map((q) => (q.key === key ? update(q) : q)));
  const changeOption = (
    questionKey: number,
    optionKey: number,
    update: (option: DraftOption) => DraftOption,
  ) =>
    changeQuestion(questionKey, (question) => ({
      ...question,
      options: question.options.map((o) => (o.key === optionKey ? update(o) : o)),
    }));
  const move = (index: number, by: number) =>
    changeQuestions((current) => {
      const next = [...current];
      const [question] = next.splice(index, 1);
      next.splice(index + by, 0, question);
      return next;
    });

  async function save() {
    setBusy(true);
    setStatus(null);
    try {
      const response = await fetch(`/admin/quizzes/${props.id}/save`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name,
          content: {
            intro,
            passPercent: Number(passPercent),
            maxAttempts: maxAttempts.trim() === "" ? null : Number(maxAttempts),
            questions: questions.map((question) => ({
              text: question.text,
              options: question.options.map((o) => ({ text: o.text, correct: o.correct })),
            })),
          },
        }),
      });
      if (response.ok) {
        setDirty(false);
        setStatus({ tone: "info", text: "Gespeichert." });
      } else {
        setStatus({ tone: "error", text: (await response.text()) || "Speichern fehlgeschlagen." });
      }
    } catch {
      setStatus({ tone: "error", text: "Keine Verbindung zum Server." });
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <p className="text-sm">
        {/* Bewusst ein normaler Link: Nur so greift die Warnung bei ungespeicherten Änderungen. */}
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages */}
        <a href="/admin/quizzes" className="text-primary-strong underline underline-offset-2">
          ← Quizzes
        </a>
      </p>

      <label className="mt-4 block">
        <span className="text-sm font-medium">Name</span>
        <input
          className={`${input} mt-1.5`}
          value={name}
          maxLength={MAX_NAME_LENGTH}
          onChange={(event) => change(setName)(event.target.value)}
        />
      </label>
      <label className="mt-5 block">
        <span className="text-sm font-medium">Einleitung</span>
        <textarea
          className={`${input} mt-1.5 h-24`}
          value={intro}
          maxLength={MAX_INTRO_LENGTH}
          onChange={(event) => change(setIntro)(event.target.value)}
        />
        <span className="mt-1.5 block text-sm text-muted">
          Steht über den Fragen, zum Beispiel worum es geht und was erlaubt ist. Kann leer bleiben.
        </span>
      </label>
      <div className="mt-5 grid gap-5 sm:grid-cols-2">
        <label className="block">
          <span className="text-sm font-medium">Bestanden ab (Prozent)</span>
          <input
            type="number"
            min={1}
            max={100}
            className={`${input} mt-1.5 max-w-32`}
            value={passPercent}
            onChange={(event) => change(setPassPercent)(event.target.value)}
          />
          <span className="mt-1.5 block text-sm text-muted">
            Anteil der Fragen, die richtig beantwortet sein müssen.
          </span>
        </label>
        <label className="block">
          <span className="text-sm font-medium">Versuche</span>
          <input
            type="number"
            min={1}
            max={MAX_ATTEMPTS_LIMIT}
            placeholder="beliebig"
            className={`${input} mt-1.5 max-w-32`}
            value={maxAttempts}
            onChange={(event) => change(setMaxAttempts)(event.target.value)}
          />
          <span className="mt-1.5 block text-sm text-muted">
            Leer lassen, wenn man es beliebig oft versuchen darf.
          </span>
        </label>
      </div>

      <h2 className="mt-10 text-base font-semibold">Fragen</h2>
      <p className="mt-1 text-sm text-muted">
        Kreuze bei jeder Frage an, welche Antworten richtig sind. Sind es mehrere, müssen
        Teilnehmende genau diese ankreuzen.
      </p>
      <ol className="mt-4 space-y-5">
        {questions.map((question, index) => (
          <li key={question.key} className="rounded-md border border-border px-4 py-4">
            <div className="flex items-baseline justify-between gap-4">
              <span className="text-sm font-medium">Frage {index + 1}</span>
              <span className="flex gap-4">
                <button
                  type="button"
                  className={linkButton}
                  disabled={index === 0}
                  onClick={() => move(index, -1)}
                >
                  Nach oben
                </button>
                <button
                  type="button"
                  className={linkButton}
                  disabled={index === questions.length - 1}
                  onClick={() => move(index, 1)}
                >
                  Nach unten
                </button>
                <button
                  type="button"
                  className="text-sm text-red-700 underline underline-offset-2 hover:no-underline disabled:text-muted disabled:no-underline"
                  disabled={questions.length === 1}
                  onClick={() =>
                    changeQuestions((current) => current.filter((q) => q.key !== question.key))
                  }
                >
                  Entfernen
                </button>
              </span>
            </div>
            <textarea
              aria-label={`Text von Frage ${index + 1}`}
              className={`${input} mt-1.5 h-20`}
              value={question.text}
              maxLength={MAX_QUESTION_LENGTH}
              onChange={(event) =>
                changeQuestion(question.key, (q) => ({ ...q, text: event.target.value }))
              }
            />
            <ul className="mt-3 space-y-2">
              {question.options.map((option, optionIndex) => (
                <li key={option.key} className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    className="size-4 shrink-0"
                    checked={option.correct}
                    aria-label={`Antwort ${optionIndex + 1} ist richtig`}
                    title="Richtige Antwort"
                    onChange={(event) =>
                      changeOption(question.key, option.key, (o) => ({
                        ...o,
                        correct: event.target.checked,
                      }))
                    }
                  />
                  <input
                    className={input}
                    value={option.text}
                    maxLength={MAX_OPTION_LENGTH}
                    placeholder={`Antwort ${optionIndex + 1}`}
                    aria-label={`Antwort ${optionIndex + 1}`}
                    onChange={(event) =>
                      changeOption(question.key, option.key, (o) => ({
                        ...o,
                        text: event.target.value,
                      }))
                    }
                  />
                  <button
                    type="button"
                    className={`${linkButton} shrink-0`}
                    disabled={question.options.length <= MIN_OPTIONS}
                    onClick={() =>
                      changeQuestion(question.key, (q) => ({
                        ...q,
                        options: q.options.filter((o) => o.key !== option.key),
                      }))
                    }
                  >
                    Entfernen
                  </button>
                </li>
              ))}
            </ul>
            <button
              type="button"
              className={`${smallButton} mt-3`}
              disabled={question.options.length >= MAX_OPTIONS}
              onClick={() =>
                changeQuestion(question.key, (q) => ({
                  ...q,
                  options: [...q.options, { key: newKey(), text: "", correct: false }],
                }))
              }
            >
              Antwort hinzufügen
            </button>
          </li>
        ))}
      </ol>
      <button
        type="button"
        className={`${smallButton} mt-4`}
        disabled={questions.length >= MAX_QUESTIONS}
        onClick={() => changeQuestions((current) => [...current, blankQuestion()])}
      >
        Frage hinzufügen
      </button>

      <div className="sticky bottom-0 mt-8 flex flex-wrap items-center gap-4 border-t border-border bg-background py-4">
        <button
          type="button"
          className="rounded-md bg-primary-strong px-4 py-2 text-base font-medium text-white hover:brightness-95 disabled:opacity-50"
          disabled={busy}
          onClick={save}
        >
          Speichern
        </button>
        <span
          role="status"
          className={`text-sm ${status?.tone === "error" ? "text-red-700" : "text-muted"}`}
        >
          {status?.text ?? (dirty ? "Ungespeicherte Änderungen" : "")}
        </span>
        <form
          method="post"
          action={`/admin/quizzes/${props.id}/delete`}
          className="ml-auto"
          onSubmit={(event) => {
            if (!window.confirm(`Quiz „${name}“ endgültig löschen?`)) event.preventDefault();
            else setDirty(false);
          }}
        >
          <button type="submit" className="text-sm text-red-700 underline underline-offset-2">
            Löschen
          </button>
        </form>
      </div>
      <p className="text-sm text-muted">
        Änderungen gelten für künftige Kohorten. Wo das Quiz schon verlangt wird, bleibt es,
        wie es beim Ausstellen war.
      </p>
    </>
  );
}
