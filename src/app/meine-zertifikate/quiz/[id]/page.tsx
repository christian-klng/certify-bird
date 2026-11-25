import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { Button, Heading, Notice, TextLink, WidePage } from "@/components/ui";
import { getCurrentParticipant } from "@/lib/auth/request";
import { findOwnCandidate } from "@/lib/quizzes/candidates";
import { attemptsLeft, neededCorrect, publicQuestions } from "@/lib/quizzes/quiz";
import { issuanceQuiz } from "@/lib/quizzes/store";

export const metadata = { title: "Quiz – Certify Bird", robots: "noindex" };

export default function QuizPage(props: PageProps<"/meine-zertifikate/quiz/[id]">) {
  return (
    <WidePage>
      <Suspense fallback={null}>
        <Quiz params={props.params} searchParams={props.searchParams} />
      </Suspense>
    </WidePage>
  );
}

async function Quiz(props: {
  params: PageProps<"/meine-zertifikate/quiz/[id]">["params"];
  searchParams: PageProps<"/meine-zertifikate/quiz/[id]">["searchParams"];
}) {
  const person = await getCurrentParticipant();
  if (!person) redirect("/login");
  const { id } = await props.params;
  const query = await props.searchParams;
  const candidate = await findOwnCandidate(person.organization.id, person.email, id);
  const quiz = candidate ? issuanceQuiz(candidate.issuance) : null;
  // Auch nach bestandenem Quiz gibt es den Eintrag nicht mehr: zurück zur Übersicht.
  if (!candidate || !quiz) notFound();

  const questions = publicQuestions(quiz);
  const needed = neededCorrect(quiz);
  const left = attemptsLeft(quiz, candidate.attempts);
  const failedJust = "failed" in query && candidate.attempts > 0;

  return (
    <>
      <p className="text-sm">
        <TextLink href="/meine-zertifikate">← Meine Zertifikate</TextLink>
      </p>
      <Heading
        eyebrow={candidate.issuance.issuerName}
        title={`Quiz: ${candidate.issuance.courseTitle}`}
        text={`${questions.length} ${questions.length === 1 ? "Frage" : "Fragen"}. Bestanden hast du mit ${needed} richtigen. ${
          left === null
            ? "Du kannst es beliebig oft versuchen."
            : left === 1
              ? "Du hast noch einen Versuch."
              : `Du hast noch ${left} Versuche.`
        }`}
      />
      {failedJust && (
        <Notice tone="error">
          Das hat noch nicht gereicht: {candidate.lastCorrect} von {candidate.lastTotal} richtig, nötig sind{" "}
          {needed}.{left !== 0 && " Du kannst es gleich noch einmal versuchen."}
        </Notice>
      )}

      {left === 0 ? (
        <Notice tone={failedJust ? "info" : "error"}>
          Deine Versuche sind aufgebraucht. Wende dich bitte an {candidate.issuance.issuerName},
          wenn du es noch einmal versuchen möchtest.
        </Notice>
      ) : (
        <form method="post" action={`/meine-zertifikate/quiz/${candidate.id}/submit`}>
          {quiz.intro && <p className="mt-6 whitespace-pre-line text-base">{quiz.intro}</p>}
          <ol className="mt-6 space-y-6">
            {questions.map((question, index) => (
              <li key={question.id}>
                <fieldset className="rounded-md border border-border px-5 py-4">
                  <legend className="px-1 text-sm text-muted">
                    Frage {index + 1} von {questions.length}
                  </legend>
                  <p className="whitespace-pre-line font-medium">{question.text}</p>
                  {question.multiple && (
                    <p className="mt-1 text-sm text-muted">Mehrere Antworten sind richtig.</p>
                  )}
                  <ul className="mt-3 space-y-2">
                    {question.options.map((option) => (
                      <li key={option.id}>
                        <label className="flex items-start gap-3">
                          <input
                            type={question.multiple ? "checkbox" : "radio"}
                            name={question.id}
                            value={option.id}
                            required={!question.multiple}
                            className="mt-1 size-4 shrink-0"
                          />
                          <span>{option.text}</span>
                        </label>
                      </li>
                    ))}
                  </ul>
                </fieldset>
              </li>
            ))}
          </ol>
          <Button type="submit">Antworten abgeben</Button>
        </form>
      )}
    </>
  );
}
