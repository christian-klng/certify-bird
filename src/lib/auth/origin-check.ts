// Herkunftsprüfung für Formulare. Ohne Datenbank und ohne Next.js, damit sie sich testen lässt.

export type OriginKind =
  /** Das Formular kam von einer Seite derselben Adresse. */
  | "same"
  /**
   * Der Browser nennt als Herkunft "null". Das passiert in abgeschirmten
   * Fenstern: Webmailer zeigen Mails in einem Sandbox-Rahmen, und ein daraus
   * geöffneter Tab erbt die Abschirmung. Die Seite selbst ist dann unsere,
   * der Browser verschweigt es aber.
   */
  | "opaque"
  /** Fremde Seite, oder gar keine Angabe. */
  | "foreign";

export function classifyOrigin(
  originHeader: string | null,
  hostHeader: string | null,
): OriginKind {
  if (!originHeader) return "foreign";
  if (originHeader.trim().toLowerCase() === "null") return "opaque";
  try {
    return new URL(originHeader).host.toLowerCase() === (hostHeader ?? "").toLowerCase()
      ? "same"
      : "foreign";
  } catch {
    return "foreign";
  }
}

/**
 * Text der Antwort, wenn ein Formular abgelehnt wird. `host` ist die Adresse,
 * unter der die Anfrage ankam; sie steht im Hinweis, weil die Adresszeile in
 * diesem Moment die eines Formulars zeigt und sich nicht neu öffnen lässt.
 */
export function rejectionText(kind: Exclude<OriginKind, "same">, host: string | null): string {
  return kind === "opaque"
    ? "Dieses Fenster wurde aus deinem Mail-Postfach heraus geöffnet und ist deshalb eingeschränkt: " +
        "Formulare funktionieren hier nicht. " +
        `Öffne einen neuen Tab und gib dort ${host ?? "die Adresse dieser Seite"} ein. ` +
        "Du bleibst angemeldet. Bitte nicht aus diesem Fenster heraus öffnen."
    : "Diese Anfrage kam nicht von dieser Seite. Geh zurück, lade die Seite neu und versuche es noch einmal.";
}
