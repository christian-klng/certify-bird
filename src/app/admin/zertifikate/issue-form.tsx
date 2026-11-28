"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { IssueResponse } from "@/lib/certificates/recipients-request";

const input =
  "mt-1.5 block w-full rounded-md border border-border bg-background px-3 py-2 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/30";

/**
 * Formular für Kohorten. Mit `templates` legt es eine neue Kohorte an, ohne
 * trägt es weitere Personen in eine bestehende ein. Es schickt die Daten
 * selbst ab, damit die Teilnehmerliste bei Fehlern stehen bleibt.
 */
export function IssueForm(props: {
  action: string;
  templates?: { id: string; name: string }[];
  /** Quizzes zur Auswahl beim Anlegen (nur solche mit Fragen). */
  quizzes?: { id: string; name: string }[];
  today?: string;
}) {
  const { templates } = props;
  const router = useRouter();
  const [templateId, setTemplateId] = useState(templates?.[0]?.id ?? "");
  const [courseTitle, setCourseTitle] = useState(templates?.[0]?.name ?? "");
  const [titleEdited, setTitleEdited] = useState(false);
  const [quizId, setQuizId] = useState("");
  const [issuedOn, setIssuedOn] = useState(props.today ?? "");
  const [recipients, setRecipients] = useState("");
  const [busy, setBusy] = useState(false);
  const [problem, setProblem] = useState<{ error: string; lines?: string[] } | null>(null);

  async function submit(event: React.FormEvent) {
    event.preventDefault();
    setBusy(true);
    setProblem(null);
    try {
      const response = await fetch(props.action, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(
          templates
            ? { templateId, quizId: quizId || null, courseTitle, issuedOn, recipients }
            : { recipients },
        ),
      });
      const result = (await response.json()) as IssueResponse;
      if (result.ok) {
        router.push(`/admin/zertifikate/${result.id}?${templates ? "created" : "added"}`);
        // Beim Ergänzen bleibt die Seite dieselbe: Liste neu laden, Feld leeren.
        router.refresh();
        setRecipients("");
        setBusy(false);
        return;
      }
      setProblem(result);
    } catch {
      setProblem({ error: "Das hat nicht geklappt. Bitte melde dich neu an und versuch es noch einmal." });
    }
    setBusy(false);
  }

  return (
    <form onSubmit={submit} className="mt-2 max-w-xl">
      {templates && (
        <>
          <label className="mt-5 block">
            <span className="text-sm font-medium">Vorlage</span>
            <select
              className={input}
              value={templateId}
              onChange={(event) => {
                setTemplateId(event.target.value);
                // Der Titel folgt der Vorlage, bis man ihn selbst ändert.
                if (!titleEdited) {
                  setCourseTitle(templates.find((t) => t.id === event.target.value)?.name ?? "");
                }
              }}
            >
              {templates.map((template) => (
                <option key={template.id} value={template.id}>
                  {template.name}
                </option>
              ))}
            </select>
          </label>
          <label className="mt-5 block">
            <span className="text-sm font-medium">Kurs</span>
            <input
              className={input}
              value={courseTitle}
              required
              maxLength={200}
              onChange={(event) => {
                setCourseTitle(event.target.value);
                setTitleEdited(true);
              }}
            />
            <span className="mt-1.5 block text-sm text-muted">
              Der Name dieser Kohorte, zum Beispiel mit Semester oder Jahrgang. Er steht auf dem
              Zertifikat an der Stelle von {"{kurs}"} und auf der Zertifikatsseite.
            </span>
          </label>
          <label className="mt-5 block">
            <span className="text-sm font-medium">Ausstellungsdatum</span>
            <input
              type="date"
              className={`${input} max-w-48`}
              value={issuedOn}
              required
              onChange={(event) => setIssuedOn(event.target.value)}
            />
            <span className="mt-1.5 block text-sm text-muted">
              Steht auf den Zertifikaten. Ohne Quiz kannst du es beim Ausstellen noch ändern.
            </span>
          </label>
          {props.quizzes && props.quizzes.length > 0 && (
            <label className="mt-5 block">
              <span className="text-sm font-medium">Leistungsnachweis</span>
              <select
                className={input}
                value={quizId}
                onChange={(event) => setQuizId(event.target.value)}
              >
                <option value="">Ohne Quiz: Du stellst die Zertifikate selbst aus</option>
                {props.quizzes.map((quiz) => (
                  <option key={quiz.id} value={quiz.id}>
                    Quiz „{quiz.name}“ muss bestanden werden
                  </option>
                ))}
              </select>
              <span className="mt-1.5 block text-sm text-muted">
                Mit Quiz bekommen die Teilnehmenden ihr Zertifikat von selbst, sobald sie es
                bestanden haben.
              </span>
            </label>
          )}
        </>
      )}
      <label className="mt-5 block">
        <span className="text-sm font-medium">Teilnehmende</span>
        <textarea
          className={`${input} h-48 font-mono text-sm`}
          value={recipients}
          required={!templates}
          placeholder={"Anna Müller, anna@beispiel.de\nJörg Çelik, joerg@beispiel.de"}
          onChange={(event) => setRecipients(event.target.value)}
        />
        <span className="mt-1.5 block text-sm text-muted">
          Eine Person pro Zeile: Name und E-Mail-Adresse, getrennt durch Komma, Semikolon oder
          Tabulator. Zeilen aus einer Tabelle kannst du direkt einfügen.
          {templates && " Du kannst die Liste auch leer lassen und später eintragen."}
        </span>
      </label>

      {problem && (
        <div role="alert" className="mt-5 rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-800">
          <p>{problem.error}</p>
          {problem.lines && (
            <ul className="mt-2 list-disc pl-5">
              {problem.lines.map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          )}
        </div>
      )}

      <button
        type="submit"
        disabled={busy}
        className="mt-6 inline-flex items-center justify-center rounded-md bg-primary-strong px-4 py-2 text-base font-medium text-white hover:brightness-95 disabled:opacity-50"
      >
        {templates ? "Kohorte anlegen" : "Eintragen"}
      </button>
    </form>
  );
}
