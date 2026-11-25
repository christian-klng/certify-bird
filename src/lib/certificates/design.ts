import { checkTemplate, type Template } from "@pdfme/common";

/** Gestaltung einer Vorlage im Format von pdfme. */
export type Design = Template;

/**
 * Platzhalter, die beim Ausstellen eines Zertifikats ersetzt werden. Sie
 * stehen in geschweiften Klammern in einem „Text mit Platzhaltern".
 */
export const PLACEHOLDERS = [
  { key: "name", label: "Name der teilnehmenden Person", sample: "Jörg Müßig-Çelik" },
  { key: "kurs", label: "Titel der Weiterbildung", sample: "Größere Übungen für Fortgeschrittene" },
  { key: "datum", label: "Ausstellungsdatum", sample: "12. März 2026" },
  { key: "anbieter", label: "Name des Bildungsanbieters", sample: "Demo Akademie" },
] as const;

export type PlaceholderKey = (typeof PLACEHOLDERS)[number]["key"];
export type PlaceholderValues = Record<PlaceholderKey, string>;

const PLACEHOLDER_KEYS: readonly string[] = PLACEHOLDERS.map((p) => p.key);

/** Feldtypen, die eine Vorlage enthalten darf (siehe plugins.ts). */
export const ALLOWED_FIELD_TYPES = [
  "text",
  "multiVariableText",
  "image",
  "svg",
  "line",
  "rectangle",
  "ellipse",
];

/** Obergrenze für eine gespeicherte Gestaltung samt eingebetteter Bilder. */
export const MAX_DESIGN_BYTES = 8 * 1024 * 1024;

export const MAX_NAME_LENGTH = 120;
export const MAX_DESCRIPTION_LENGTH = 10_000;

/** Kürzt und prüft den Namen einer Vorlage; null, wenn er leer oder zu lang ist. */
export function normalizeName(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const name = value.trim().replace(/\s+/g, " ");
  return name.length > 0 && name.length <= MAX_NAME_LENGTH ? name : null;
}

/** Startvorlage: A4 quer mit Titel, Name und Bestätigungstext. */
export const starterDesign: Design = {
  basePdf: { width: 297, height: 210, padding: [15, 15, 15, 15] },
  schemas: [
    [
      {
        name: "titel",
        type: "text",
        content: "Teilnahmezertifikat",
        position: { x: 20, y: 30 },
        width: 257,
        height: 20,
        fontSize: 36,
        alignment: "center",
      },
      {
        name: "linie",
        type: "line",
        position: { x: 98, y: 55 },
        width: 100,
        height: 0.6,
        color: "#5bb8f0",
      },
      {
        name: "teilnehmer",
        type: "multiVariableText",
        text: "{name}",
        // Anzeige im Editor, solange keine echten Werte eingesetzt sind.
        content: JSON.stringify({ name: "NAME" }),
        variables: ["name"],
        position: { x: 20, y: 70 },
        width: 257,
        height: 16,
        fontSize: 28,
        alignment: "center",
      },
      {
        name: "bestaetigung",
        type: "multiVariableText",
        text: "hat am {datum} erfolgreich an der Weiterbildung „{kurs}“ teilgenommen.",
        content: JSON.stringify({ datum: "DATUM", kurs: "KURS" }),
        variables: ["datum", "kurs"],
        position: { x: 40, y: 95 },
        width: 217,
        height: 30,
        fontSize: 14,
        alignment: "center",
        lineHeight: 1.4,
      },
    ],
  ],
};

/** Namen aller Platzhalter, die in den Texten der Vorlage vorkommen. */
export function usedPlaceholders(design: Design): string[] {
  const found = new Set<string>();
  for (const page of design.schemas) {
    for (const field of page) {
      if (field.type !== "multiVariableText") continue;
      if (typeof field.text === "string") {
        for (const match of field.text.matchAll(/\{([^{}]+)\}/g)) found.add(match[1].trim());
      }
      if (Array.isArray(field.variables)) {
        for (const variable of field.variables) found.add(String(variable));
      }
    }
  }
  return [...found];
}

export type DesignCheck = { ok: true; design: Design } | { ok: false; error: string };

/**
 * Prüft eine Gestaltung, die aus dem Browser kommt, bevor sie gespeichert oder
 * zu einem PDF verarbeitet wird.
 */
export function checkDesign(input: unknown): DesignCheck {
  let design: Design;
  try {
    checkTemplate(input);
    design = input as Design;
  } catch {
    return { ok: false, error: "Die Vorlage hat kein gültiges Format." };
  }

  // Ein Hintergrund muss eingebettet sein: Adressen würde sonst der Server
  // oder der Browser anderer Mitglieder abrufen.
  const { basePdf } = design;
  if (typeof basePdf === "string") {
    if (!basePdf.startsWith("data:application/pdf;base64,")) {
      return { ok: false, error: "Der Hintergrund muss ein hochgeladenes PDF sein." };
    }
  } else if (ArrayBuffer.isView(basePdf) || basePdf instanceof ArrayBuffer) {
    return { ok: false, error: "Der Hintergrund muss ein hochgeladenes PDF sein." };
  }

  for (const page of design.schemas) {
    for (const field of page) {
      if (!ALLOWED_FIELD_TYPES.includes(field.type)) {
        return { ok: false, error: `Der Feldtyp „${field.type}“ ist nicht erlaubt.` };
      }
    }
  }

  const unknown = usedPlaceholders(design).filter((key) => !PLACEHOLDER_KEYS.includes(key));
  if (unknown.length > 0) {
    const list = unknown.map((key) => `{${key}}`).join(", ");
    const allowed = PLACEHOLDER_KEYS.map((key) => `{${key}}`).join(", ");
    return {
      ok: false,
      error: `Unbekannte Platzhalter: ${list}. Möglich sind ${allowed}.`,
    };
  }
  return { ok: true, design };
}

/** Beispielwerte für die Vorschau. */
export function sampleValues(organizationName: string): PlaceholderValues {
  const values = Object.fromEntries(PLACEHOLDERS.map((p) => [p.key, p.sample]));
  return { ...values, anbieter: organizationName } as PlaceholderValues;
}

/**
 * Eingabedaten für pdfme: Texte mit Platzhaltern bekommen die Werte, alle
 * anderen Felder behalten den Inhalt aus der Vorlage.
 */
export function buildInputs(design: Design, values: PlaceholderValues): Record<string, string>[] {
  const input: Record<string, string> = {};
  for (const page of design.schemas) {
    for (const field of page) {
      if (field.type === "multiVariableText") {
        input[field.name] = JSON.stringify(values);
      } else if (!field.readOnly && typeof field.content === "string") {
        input[field.name] = field.content;
      }
    }
  }
  return [input];
}
