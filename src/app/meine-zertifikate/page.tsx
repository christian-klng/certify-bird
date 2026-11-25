import { redirect } from "next/navigation";
import { Suspense } from "react";
import { Heading, Notice, TextLink, WidePage } from "@/components/ui";
import { getCurrentParticipant, getRequestContext } from "@/lib/auth/request";
import { consentText } from "@/lib/certificates/consent";
import { listOwnCertificates } from "@/lib/certificates/portal";
import { formatIssueDate } from "@/lib/certificates/recipients";
import { listOwnCandidates } from "@/lib/quizzes/candidates";
import { attemptsLeft } from "@/lib/quizzes/quiz";
import { issuanceQuiz } from "@/lib/quizzes/store";

export const metadata = { title: "Meine Zertifikate – Certify Bird", robots: "noindex" };

export default function MyCertificatesPage(props: PageProps<"/meine-zertifikate">) {
  return (
    <WidePage>
      <Suspense fallback={null}>
        <MyCertificates searchParams={props.searchParams} />
      </Suspense>
    </WidePage>
  );
}

async function MyCertificates(props: {
  searchParams: PageProps<"/meine-zertifikate">["searchParams"];
}) {
  const person = await getCurrentParticipant();
  if (!person) redirect("/login");
  const query = await props.searchParams;
  const { origin } = await getRequestContext();
  const [certificates, candidates] = await Promise.all([
    listOwnCertificates(person.organization.id, person.email),
    listOwnCandidates(person.organization.id, person.email),
  ]);

  const smallButton =
    "rounded-md border border-border px-3 py-1.5 text-sm hover:bg-primary/10";

  return (
    <>
      <Heading
        eyebrow={person.organization.name}
        title="Meine Zertifikate"
        text={`Angemeldet als ${person.email}.`}
      />
      {"passed" in query && (
        <Notice>Bestanden, herzlichen Glückwunsch! Dein Zertifikat steht unten.</Notice>
      )}
      {"published" in query && (
        <Notice>Dein Zertifikat ist jetzt öffentlich. Die Adresse steht unten.</Notice>
      )}
      {"unpublished" in query && (
        <Notice>Die öffentliche Seite ist abgeschaltet. Das Zertifikat sieht nur noch du.</Notice>
      )}
      {query.error === "consent" && (
        <Notice tone="error">
          Zum Veröffentlichen musst du das Kästchen mit der Einwilligung ankreuzen.
        </Notice>
      )}

      {candidates.length > 0 && (
        <ul className="mt-6 space-y-4">
          {candidates.map((candidate) => {
            const quiz = issuanceQuiz(candidate.issuance);
            const left = quiz ? attemptsLeft(quiz, candidate.attempts) : 0;
            return (
              <li key={candidate.id} className="rounded-md border border-border px-5 py-4">
                <h2 className="text-lg font-semibold">{candidate.issuance.courseTitle}</h2>
                <p className="mt-1 text-sm text-muted">
                  Dein Zertifikat bekommst du, sobald du das Quiz bestanden hast.
                  {candidate.attempts > 0 &&
                    ` Letzter Versuch: ${candidate.lastCorrect} von ${candidate.lastTotal} richtig.`}
                </p>
                <p className="mt-3 text-sm">
                  {left === 0 ? (
                    <span className="text-muted">
                      Deine Versuche sind aufgebraucht. Wende dich bitte an{" "}
                      {candidate.issuance.issuerName}.
                    </span>
                  ) : (
                    <TextLink href={`/meine-zertifikate/quiz/${candidate.id}`}>
                      {candidate.attempts > 0 ? "Quiz erneut versuchen" : "Quiz beginnen"}
                    </TextLink>
                  )}
                </p>
              </li>
            );
          })}
        </ul>
      )}

      {certificates.length === 0 ? (
        candidates.length === 0 && (
          <p className="mt-6 text-sm text-muted">
            Für diese E-Mail-Adresse gibt es hier kein Zertifikat.
          </p>
        )
      ) : (
        <ul className="mt-6 space-y-6">
          {certificates.map((certificate) => {
            const base = `/meine-zertifikate/${certificate.id}`;
            const publicUrl = `${origin ?? ""}/z/${certificate.id}`;
            return (
              <li key={certificate.id} className="rounded-md border border-border px-5 py-4">
                <h2 className="text-lg font-semibold">{certificate.issuance.courseTitle}</h2>
                <p className="mt-1 text-sm text-muted">
                  Ausgestellt am {formatIssueDate(certificate.issuance.issuedOn)} für{" "}
                  {certificate.recipientName}
                </p>
                <p className="mt-3 flex flex-wrap gap-x-6 gap-y-1 text-sm">
                  <TextLink href={`${base}/pdf`} target="_blank">
                    Als PDF öffnen
                  </TextLink>
                  <TextLink href={`${base}/badge`}>Open Badge herunterladen</TextLink>
                </p>
                <p className="mt-1 text-sm text-muted">
                  Das Open Badge ist eine digital signierte Datei für Badge-Sammlungen und
                  Bewerbungsportale, die Open Badges 3.0 annehmen.
                </p>

                {certificate.publishedAt ? (
                  <div className="mt-4 border-t border-border pt-4 text-sm">
                    <p className="font-medium">Öffentlich sichtbar</p>
                    <p className="mt-1 text-muted">
                      Diese Adresse kannst du teilen, zum Beispiel auf LinkedIn:
                    </p>
                    <p className="mt-2 break-all">
                      <TextLink href={publicUrl} target="_blank">
                        {publicUrl}
                      </TextLink>
                    </p>
                    <form method="post" action={`${base}/unpublish`} className="mt-3">
                      <button type="submit" className={smallButton}>
                        Einwilligung widerrufen und Seite abschalten
                      </button>
                    </form>
                  </div>
                ) : (
                  <form
                    method="post"
                    action={`${base}/publish`}
                    className="mt-4 border-t border-border pt-4 text-sm"
                  >
                    <p className="font-medium">Nicht öffentlich</p>
                    <p className="mt-1 text-muted">
                      Im Moment siehst nur du dieses Zertifikat. Mit einer öffentlichen Seite
                      kannst du es teilen und andere können es prüfen.
                    </p>
                    <label className="mt-3 flex items-start gap-3">
                      <input type="checkbox" name="consent" required className="mt-1 shrink-0" />
                      <span>{consentText(certificate.issuance.issuerName)}</span>
                    </label>
                    <button type="submit" className={`${smallButton} mt-3`}>
                      Öffentlich stellen
                    </button>
                  </form>
                )}
              </li>
            );
          })}
        </ul>
      )}

      <div className="mt-10 flex gap-6 text-sm">
        {person.isMember && <TextLink href="/admin">Zur Verwaltung</TextLink>}
        <form method="post" action="/logout">
          <button
            type="submit"
            className="text-primary-strong underline underline-offset-2 hover:no-underline"
          >
            Abmelden
          </button>
        </form>
      </div>
    </>
  );
}
