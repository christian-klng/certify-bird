import { normalizeEmail } from "../auth/tokens";

export const MAX_RECIPIENTS = 500;
export const MAX_RECIPIENT_NAME_LENGTH = 200;

export type Recipient = { name: string; email: string };
export type RecipientError = { line: number; text: string; reason: string };

/**
 * Liest eine Teilnehmerliste: eine Person pro Zeile, Name und E-Mail-Adresse
 * in beliebiger Reihenfolge, getrennt durch Komma, Semikolon, Tabulator oder
 * als „Name <adresse>". So lassen sich Zeilen aus einer Tabelle einfügen.
 */
export function parseRecipients(text: string): {
  recipients: Recipient[];
  errors: RecipientError[];
} {
  const recipients: Recipient[] = [];
  const errors: RecipientError[] = [];
  const seen = new Set<string>();

  text.split(/\r?\n/).forEach((raw, index) => {
    const line = raw.trim();
    if (!line) return;
    const fail = (reason: string) => errors.push({ line: index + 1, text: line, reason });

    const [token, ...more] = line.match(/[^\s,;<>"]+@[^\s,;<>"]+/g) ?? [];
    if (!token) return fail("E-Mail-Adresse fehlt");
    if (more.length > 0) return fail("mehr als eine E-Mail-Adresse");
    const email = normalizeEmail(token);
    if (!email) return fail("E-Mail-Adresse ist ungültig");

    const name = line
      .replace(token, " ")
      .replace(/[<>"\t]/g, " ")
      .replace(/\s+/g, " ")
      .replace(/^[\s,;]+|[\s,;]+$/g, "");
    if (!name) return fail("Name fehlt");
    if (name.length > MAX_RECIPIENT_NAME_LENGTH) return fail("Name ist zu lang");
    if (seen.has(email)) return fail("E-Mail-Adresse kommt doppelt vor");

    seen.add(email);
    recipients.push({ name, email });
  });

  if (recipients.length + errors.length > MAX_RECIPIENTS) {
    return {
      recipients: [],
      errors: [{ line: 0, text: "", reason: `höchstens ${MAX_RECIPIENTS} Personen auf einmal` }],
    };
  }
  return { recipients, errors };
}

/** Prüft ein Datum aus einem Datumsfeld (JJJJ-MM-TT); null, wenn es keines ist. */
export function parseIssueDate(value: unknown): Date | null {
  if (typeof value !== "string" || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const date = new Date(`${value}T00:00:00Z`);
  // Unmögliche Tage wie der 31. Februar würden sonst in den März rutschen.
  return !Number.isNaN(date.getTime()) && date.toISOString().startsWith(value) ? date : null;
}

const longDate = new Intl.DateTimeFormat("de-DE", { dateStyle: "long", timeZone: "UTC" });

/** Datum, wie es auf dem Zertifikat steht: 12. März 2026. */
export function formatIssueDate(date: Date): string {
  return longDate.format(date);
}
