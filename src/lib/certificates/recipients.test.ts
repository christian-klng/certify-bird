import { describe, expect, it } from "vitest";
import { formatIssueDate, parseIssueDate, parseRecipients } from "./recipients";

describe("parseRecipients", () => {
  it("liest die üblichen Schreibweisen", () => {
    const { recipients, errors } = parseRecipients(
      [
        "Anna Müller, anna@beispiel.de",
        "Jörg Çelik; JOERG@Beispiel.de",
        "Zoë Ångström\tzoe@beispiel.de",
        "Max Mustermann <max@beispiel.de>",
        "eva@beispiel.de, Eva Klein",
        "",
        "  Schmidt, Peter, peter@beispiel.de  ",
      ].join("\n"),
    );
    expect(errors).toEqual([]);
    expect(recipients).toEqual([
      { name: "Anna Müller", email: "anna@beispiel.de" },
      { name: "Jörg Çelik", email: "joerg@beispiel.de" },
      { name: "Zoë Ångström", email: "zoe@beispiel.de" },
      { name: "Max Mustermann", email: "max@beispiel.de" },
      { name: "Eva Klein", email: "eva@beispiel.de" },
      { name: "Schmidt, Peter", email: "peter@beispiel.de" },
    ]);
  });

  it("meldet fehlerhafte Zeilen mit Zeilennummer", () => {
    const { recipients, errors } = parseRecipients(
      ["Anna Müller", "anna@beispiel.de", "A, a@b.de, c@d.de", "B, b@beispiel", "C, a@b.de", "D, A@B.de"].join("\n"),
    );
    expect(recipients).toEqual([{ name: "C", email: "a@b.de" }]);
    expect(errors.map((e) => [e.line, e.reason])).toEqual([
      [1, "E-Mail-Adresse fehlt"],
      [2, "Name fehlt"],
      [3, "mehr als eine E-Mail-Adresse"],
      [4, "E-Mail-Adresse ist ungültig"],
      [6, "E-Mail-Adresse kommt doppelt vor"],
    ]);
  });

  it("begrenzt die Anzahl", () => {
    const text = Array.from({ length: 501 }, (_, i) => `P ${i}, p${i}@b.de`).join("\n");
    const { recipients, errors } = parseRecipients(text);
    expect(recipients).toEqual([]);
    expect(errors).toHaveLength(1);
  });
});

describe("Ausstellungsdatum", () => {
  it("nimmt echte Tage an und formatiert sie deutsch", () => {
    const date = parseIssueDate("2026-03-12");
    expect(date).not.toBeNull();
    expect(formatIssueDate(date!)).toBe("12. März 2026");
  });

  it("lehnt Unsinn ab", () => {
    expect(parseIssueDate("2026-02-31")).toBeNull();
    expect(parseIssueDate("12.03.2026")).toBeNull();
    expect(parseIssueDate(undefined)).toBeNull();
  });
});
