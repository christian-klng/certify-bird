import { notFound, redirect } from "next/navigation";
import { Suspense } from "react";
import { Heading, Notice, TextLink, WidePage } from "@/components/ui";
import { getCurrentMember } from "@/lib/auth/request";
import { findIssuance } from "@/lib/certificates/issuances";
import { formatIssueDate } from "@/lib/certificates/recipients";
import { attemptsLeft, neededCorrect } from "@/lib/quizzes/quiz";
import { issuanceQuiz } from "@/lib/quizzes/store";
import { ConfirmButton } from "../confirm-button";
import { IssueForm } from "../issue-form";

export const metadata = { title: "Ausstellung – Certify Bird", robots: "noindex" };

export default function IssuancePage(props: PageProps<"/admin/zertifikate/[id]">) {
  return (
    <WidePage>
      <Suspense fallback={null}>
        <Issuance params={props.params} searchParams={props.searchParams} />
      </Suspense>
    </WidePage>
  );
}

async function Issuance(props: {
  params: PageProps<"/admin/zertifikate/[id]">["params"];
  searchParams: PageProps<"/admin/zertifikate/[id]">["searchParams"];
}) {
  const member = await getCurrentMember();
  if (!member) redirect("/login");
  const { id } = await props.params;
  const query = await props.searchParams;
  const issuance = await findIssuance(member.organization.id, id);
  if (!issuance) notFound();
  const base = `/admin/zertifikate/${issuance.id}`;
  const count = issuance.certificates.length;
  const quiz = issuanceQuiz(issuance);
  const candidates = issuance.candidates;
  const people = count + candidates.length;
  const pending =
    issuance.certificates.filter((c) => !c.notifiedAt).length +
    candidates.filter((c) => !c.notifiedAt).length;

  return (
    <>
      <p className="text-sm">
        <TextLink href="/admin/zertifikate">← Zertifikate</TextLink>
      </p>
      <Heading
        title={issuance.courseTitle}
        text={`Ausgestellt am ${formatIssueDate(issuance.issuedOn)} von ${issuance.issuerName}${
          issuance.template ? `, Vorlage „${issuance.template.name}“` : ""
        }.`}
      />
      {"issued" in query && (
        <Notice>
          {quiz
            ? "Die Teilnehmenden sind eingetragen. Ihr Zertifikat bekommen sie, sobald sie das Quiz bestanden haben."
            : "Die Zertifikate sind ausgestellt."}
        </Notice>
      )}
      {typeof query.notified === "string" && (
        <Notice tone={query.failed === "0" ? "info" : "error"}>
          {query.notified} {query.notified === "1" ? "Person wurde" : "Personen wurden"}{" "}
          benachrichtigt.
          {query.failed !== "0" &&
            ` Bei ${query.failed} hat der Versand nicht geklappt; du kannst es erneut versuchen.`}
        </Notice>
      )}
      {query.error === "mail" && (
        <Notice tone="error">Die Benachrichtigungen konnten nicht verschickt werden.</Notice>
      )}
      {"removed" in query && <Notice>Das Zertifikat wurde gelöscht.</Notice>}
      {"candidateRemoved" in query && <Notice>Die Person wurde ausgetragen.</Notice>}
      {"attemptsReset" in query && <Notice>Die Person kann das Quiz wieder versuchen.</Notice>}

      {quiz && (
        <p className="mt-6 text-sm">
          <span className="font-medium">Mit Quiz:</span> {quiz.questions.length}{" "}
          {quiz.questions.length === 1 ? "Frage" : "Fragen"}, bestanden ab {neededCorrect(quiz)}{" "}
          richtigen,{" "}
          {quiz.maxAttempts === null
            ? "beliebig viele Versuche"
            : quiz.maxAttempts === 1
              ? "ein Versuch"
              : `${quiz.maxAttempts} Versuche`}
          .{" "}
          {issuance.quizRef && (
            <TextLink href={`/admin/quizzes/${issuance.quizRef.id}`}>
              Quiz „{issuance.quizRef.name}“
            </TextLink>
          )}
        </p>
      )}

      {pending > 0 && (
        <form
          method="post"
          action={`${base}/notify`}
          className="mt-6 rounded-md border border-border px-4 py-3"
        >
          <p className="text-sm">
            {pending < people
              ? `${pending} von ${people} Teilnehmenden wurden noch nicht benachrichtigt.`
              : candidates.length > 0
                ? "Die Teilnehmenden wissen noch nichts von ihrem Quiz."
                : "Die Teilnehmenden wissen noch nichts von ihrem Zertifikat."}{" "}
            Sie bekommen eine E-Mail mit einem persönlichen Anmeldelink.
          </p>
          <button
            type="submit"
            className="mt-3 rounded-md bg-primary-strong px-3 py-1.5 text-sm font-medium text-white hover:brightness-95"
          >
            {pending} {pending === 1 ? "Person" : "Personen"} benachrichtigen
          </button>
        </form>
      )}

      {quiz && (
        <>
          <h2 className="mt-8 text-base font-semibold">Quiz noch offen</h2>
          {candidates.length === 0 ? (
            <p className="mt-2 text-sm text-muted">Niemand muss das Quiz noch bestehen.</p>
          ) : (
            <ul className="mt-3 divide-y divide-border border-y border-border">
              {candidates.map((candidate) => {
                const left = attemptsLeft(quiz, candidate.attempts);
                const candidateBase = `${base}/kandidaten/${candidate.id}`;
                return (
                  <li key={candidate.id} className="flex items-baseline gap-4 py-3">
                    <span className="min-w-0 flex-1">
                      <span className="block truncate">{candidate.name}</span>
                      <span className="block truncate text-sm text-muted">
                        {candidate.email}
                        {" · "}
                        {candidate.attempts === 0
                          ? candidate.notifiedAt
                            ? "eingeladen"
                            : "noch nicht eingeladen"
                          : `${candidate.attempts} ${candidate.attempts === 1 ? "Versuch" : "Versuche"}, zuletzt ${candidate.lastCorrect} von ${candidate.lastTotal} richtig`}
                        {left === 0 && " · keine Versuche mehr"}
                      </span>
                    </span>
                    {candidate.attempts > 0 && quiz.maxAttempts !== null && (
                      <form method="post" action={`${candidateBase}/reset`}>
                        <button
                          type="submit"
                          className="text-sm text-primary-strong underline underline-offset-2 hover:no-underline"
                        >
                          Versuche zurücksetzen
                        </button>
                      </form>
                    )}
                    <form method="post" action={`${candidateBase}/delete`}>
                      <ConfirmButton question={`${candidate.name} aus dieser Ausstellung austragen?`}>
                        Austragen
                      </ConfirmButton>
                    </form>
                  </li>
                );
              })}
            </ul>
          )}
          <h2 className="mt-8 text-base font-semibold">Zertifikate</h2>
        </>
      )}

      {count > 0 && (
        <p className="mt-6 text-sm">
          <TextLink href={`${base}/pdf`} target="_blank">
            Alle {count} als ein PDF zum Drucken
          </TextLink>
        </p>
      )}
      {count === 0 ? (
        <p className="mt-6 text-sm text-muted">
          {quiz
            ? "Noch hat niemand das Quiz bestanden."
            : "Diese Ausstellung enthält keine Zertifikate mehr."}
        </p>
      ) : (
        <ul className="mt-4 divide-y divide-border border-y border-border">
          {issuance.certificates.map((certificate) => (
            <li key={certificate.id} className="flex items-baseline gap-4 py-3">
              <span className="min-w-0 flex-1">
                <span className="block truncate">{certificate.recipientName}</span>
                <span className="block truncate text-sm text-muted">
                  {certificate.recipientEmail}
                  {" · "}
                  {certificate.publishedAt
                    ? "öffentlich"
                    : certificate.notifiedAt
                      ? "benachrichtigt"
                      : "noch nicht benachrichtigt"}
                  {certificate.quizTotal !== null &&
                    ` · Quiz bestanden mit ${certificate.quizCorrect} von ${certificate.quizTotal}`}
                </span>
              </span>
              <TextLink href={`${base}/${certificate.id}/pdf`} target="_blank">
                PDF
              </TextLink>
              <form method="post" action={`${base}/${certificate.id}/delete`}>
                <ConfirmButton
                  question={`Zertifikat für ${certificate.recipientName} endgültig löschen?`}
                >
                  Löschen
                </ConfirmButton>
              </form>
            </li>
          ))}
        </ul>
      )}

      <h2 className="mt-10 text-base font-semibold">Weitere Teilnehmende hinzufügen</h2>
      {quiz && (
        <p className="mt-1 text-sm text-muted">
          Auch sie bekommen ihr Zertifikat erst nach bestandenem Quiz.
        </p>
      )}
      <IssueForm action={`${base}/add`} />

      <form method="post" action={`${base}/delete`} className="mt-10 border-t border-border pt-5">
        <ConfirmButton
          question={`Die ganze Ausstellung „${issuance.courseTitle}“ mit ${count} Zertifikaten${
            candidates.length > 0 ? ` und ${candidates.length} offenen Quiz-Einträgen` : ""
          } endgültig löschen?`}
        >
          Ganze Ausstellung löschen
        </ConfirmButton>
      </form>
    </>
  );
}
