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

export const metadata = { title: "Kohorte – Certify Bird", robots: "noindex" };

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
  // In Kohorten ohne Quiz erfahren Eingetragene erst mit dem Zertifikat davon.
  const invitable = quiz ? candidates : [];
  const people = count + invitable.length;
  const pending =
    issuance.certificates.filter((c) => !c.notifiedAt).length +
    invitable.filter((c) => !c.notifiedAt).length;
  const issuedOnValue = issuance.issuedOn.toISOString().slice(0, 10);

  return (
    <>
      <p className="text-sm">
        <TextLink href="/admin/zertifikate">← Kohorten</TextLink>
      </p>
      <Heading
        title={issuance.courseTitle}
        text={`Kohorte von ${issuance.issuerName}${
          issuance.template ? `, Vorlage „${issuance.template.name}“` : ""
        }. ${count > 0 ? "Ausgestellt am" : "Ausstellungsdatum"} ${formatIssueDate(issuance.issuedOn)}.`}
      />
      {"created" in query && (
        <Notice>
          Die Kohorte ist angelegt.{" "}
          {quiz
            ? "Wer eingetragen ist, bekommt sein Zertifikat, sobald das Quiz bestanden ist."
            : "Zertifikate stellst du aus, wenn es so weit ist."}
        </Notice>
      )}
      {"added" in query && <Notice>Die Personen sind eingetragen.</Notice>}
      {typeof query.issued === "string" && (
        <Notice>
          {query.issued === "1"
            ? "Ein Zertifikat wurde ausgestellt."
            : `${query.issued} Zertifikate wurden ausgestellt.`}{" "}
          Die Personen wissen davon erst, wenn du sie benachrichtigst.
        </Notice>
      )}
      {query.error === "nobody" && (
        <Notice tone="error">Bitte kreuze mindestens eine Person an.</Notice>
      )}
      {query.error === "date" && (
        <Notice tone="error">Bitte wähle ein gültiges Ausstellungsdatum.</Notice>
      )}
      {query.error === "quiz" && (
        <Notice tone="error">
          Diese Kohorte verlangt ein Quiz. Zertifikate entstehen hier nur durch Bestehen.
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
              : invitable.length > 0
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

      {!quiz && (
        <>
          <h2 className="mt-8 text-base font-semibold">Eingetragen, noch ohne Zertifikat</h2>
          {candidates.length === 0 ? (
            <p className="mt-2 text-sm text-muted">
              {count === 0
                ? "Noch ist niemand eingetragen. Unten kannst du Teilnehmende eintragen."
                : "Alle Eingetragenen haben ihr Zertifikat."}
            </p>
          ) : (
            <>
              <ul className="mt-3 divide-y divide-border border-y border-border">
                {candidates.map((candidate) => (
                  <li key={candidate.id} className="flex items-baseline gap-4 py-3">
                    <label className="flex min-w-0 flex-1 items-baseline gap-3">
                      {/* Gehört zum Formular unten; so bleibt „Austragen" ein eigenes Formular. */}
                      <input
                        type="checkbox"
                        form="issue"
                        name="candidate"
                        value={candidate.id}
                        defaultChecked
                        className="translate-y-0.5"
                      />
                      <span className="min-w-0">
                        <span className="block truncate">{candidate.name}</span>
                        <span className="block truncate text-sm text-muted">{candidate.email}</span>
                      </span>
                    </label>
                    <form method="post" action={`${base}/kandidaten/${candidate.id}/delete`}>
                      <ConfirmButton question={`${candidate.name} aus dieser Kohorte austragen?`}>
                        Austragen
                      </ConfirmButton>
                    </form>
                  </li>
                ))}
              </ul>
              <form
                id="issue"
                method="post"
                action={`${base}/ausstellen`}
                className="mt-4 rounded-md border border-border px-4 py-3"
              >
                <p className="text-sm">
                  Wer angekreuzt ist, bekommt ein Zertifikat. Die Übrigen bleiben eingetragen.
                </p>
                {count === 0 ? (
                  <label className="mt-3 block text-sm">
                    <span className="font-medium">Ausstellungsdatum</span>
                    <input
                      type="date"
                      name="issuedOn"
                      required
                      defaultValue={issuedOnValue}
                      className="mt-1.5 block rounded-md border border-border bg-background px-3 py-1.5 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/30"
                    />
                    <span className="mt-1.5 block text-muted">
                      Gilt für alle Zertifikate dieser Kohorte. Mit dem ersten Zertifikat steht
                      auch fest, wie die Vorlage aussieht.
                    </span>
                  </label>
                ) : (
                  <p className="mt-2 text-sm text-muted">
                    Datum und Gestaltung sind die der schon ausgestellten Zertifikate:{" "}
                    {formatIssueDate(issuance.issuedOn)}.
                  </p>
                )}
                <button
                  type="submit"
                  className="mt-3 rounded-md bg-primary-strong px-3 py-1.5 text-sm font-medium text-white hover:brightness-95"
                >
                  Zertifikate für Angekreuzte ausstellen
                </button>
              </form>
            </>
          )}
          <h2 className="mt-8 text-base font-semibold">Zertifikate</h2>
        </>
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
                      <ConfirmButton question={`${candidate.name} aus dieser Kohorte austragen?`}>
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
            : "Noch wurde kein Zertifikat ausgestellt."}
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

      <h2 className="mt-10 text-base font-semibold">Teilnehmende eintragen</h2>
      <p className="mt-1 text-sm text-muted">
        {quiz
          ? "Sie bekommen ihr Zertifikat, sobald sie das Quiz bestanden haben."
          : "Sie stehen danach oben in der Liste, bis du ihnen ein Zertifikat ausstellst."}
      </p>
      <IssueForm action={`${base}/add`} />

      <form method="post" action={`${base}/delete`} className="mt-10 border-t border-border pt-5">
        <ConfirmButton
          question={`Die ganze Kohorte „${issuance.courseTitle}“ mit ${count} Zertifikaten${
            candidates.length > 0 ? ` und ${candidates.length} Eingetragenen ohne Zertifikat` : ""
          } endgültig löschen?`}
        >
          Ganze Kohorte löschen
        </ConfirmButton>
      </form>
    </>
  );
}
