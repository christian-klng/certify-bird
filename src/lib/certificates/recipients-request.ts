import { parseRecipients, type Recipient } from "./recipients";

/** Antwort der Routen zum Anlegen und Eintragen an das Formular. */
export type IssueResponse = { ok: true; id: string } | { ok: false; error: string; lines?: string[] };

export function issueError(error: string, lines?: string[], status = 400): Response {
  return Response.json({ ok: false, error, lines } satisfies IssueResponse, { status });
}

/**
 * Liest die Teilnehmerliste aus dem Formular; bei Fehlern die fertige Antwort.
 * Beim Anlegen einer Kohorte darf die Liste leer sein (`allowEmpty`).
 */
export function readRecipients(
  value: unknown,
  options: { allowEmpty?: boolean } = {},
): Recipient[] | Response {
  if (typeof value !== "string" || value.length > 200_000) {
    return issueError("Die Teilnehmerliste ist unlesbar oder zu lang.");
  }
  const { recipients, errors } = parseRecipients(value);
  if (errors.length > 0) {
    return issueError(
      "Diese Zeilen konnte ich nicht lesen. Es wurde noch niemand eingetragen.",
      errors.map((e) => (e.line > 0 ? `Zeile ${e.line}: ${e.reason} („${e.text}“)` : e.reason)),
    );
  }
  if (recipients.length === 0 && !options.allowEmpty) {
    return issueError("Bitte trag mindestens eine Person ein.");
  }
  return recipients;
}
