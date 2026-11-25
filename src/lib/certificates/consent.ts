/**
 * Wortlaut der Einwilligung in die öffentliche Zertifikatsseite. Bei jeder
 * inhaltlichen Änderung bekommt er eine neue Fassung: Zu jeder Einwilligung
 * wird gespeichert, welcher Fassung zugestimmt wurde.
 */
export const CONSENT_VERSION = "2026-11";

export function consentText(issuerName: string): string {
  return (
    `Ich willige ein, dass ${issuerName} mein Zertifikat mit meinem Namen, dem Titel der ` +
    `Weiterbildung, der Beschreibung und dem Ausstellungsdatum unter einer öffentlichen ` +
    `Adresse abrufbar macht. Jede Person, die diese Adresse kennt, kann das Zertifikat ` +
    `ansehen und herunterladen. Die Einwilligung ist freiwillig. Ich kann sie hier ` +
    `jederzeit widerrufen; die Seite ist dann sofort nicht mehr erreichbar.`
  );
}
