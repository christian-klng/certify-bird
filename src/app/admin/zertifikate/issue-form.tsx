"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import type { IssueResponse } from "@/lib/certificates/recipients-request";

const input =
  "mt-1.5 block w-full rounded-md border border-border bg-background px-3 py-2 text-base outline-none focus:border-primary focus:ring-2 focus:ring-primary/30";

/**
 * Formular zum Ausstellen. Mit `templates` legt es eine neue Ausstellung an,
 * ohne ergänzt es eine bestehende um weitere Personen. Es schickt die Daten
 * selbst ab, damit die Teilnehmerliste bei Fehlern stehen bleibt.
 */
export function IssueForm(props: {
  action: string;
  templates?: { id: string; name: string }[];
  today?: string;
}) {
  const { templates } = props;
  const router = useRouter();
  const [templateId, setTemplateId] = useState(templates?.[0]?.id ?? "");
  const [courseTitle, setCourseTitle] = useState(templates?.[0]?.name ?? "");
  const [titleEdited, setTitleEdited] = useState(false);
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
          templates ? { templateId, courseTitle, issuedOn, recipients } : { recipients },
        ),
      });
      const result = (await response.json()) as IssueResponse;
      if (result.ok) {
        router.push(`/admin/zertifikate/${result.id}?issued`);
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
            <span className="text-sm font-medium">Titel der Weiterbildung</span>
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
              Steht auf dem Zertifikat an der Stelle von {"{kurs}"}.
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
          </label>
        </>
      )}
      <label className="mt-5 block">
        <span className="text-sm font-medium">Teilnehmende</span>
        <textarea
          className={`${input} h-48 font-mono text-sm`}
          value={recipients}
          required
          placeholder={"Anna Müller, anna@beispiel.de\nJörg Çelik, joerg@beispiel.de"}
          onChange={(event) => setRecipients(event.target.value)}
        />
        <span className="mt-1.5 block text-sm text-muted">
          Eine Person pro Zeile: Name und E-Mail-Adresse, getrennt durch Komma, Semikolon oder
          Tabulator. Zeilen aus einer Tabelle kannst du direkt einfügen.
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
        {templates ? "Zertifikate ausstellen" : "Hinzufügen"}
      </button>
    </form>
  );
}
