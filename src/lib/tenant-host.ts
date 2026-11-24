/**
 * Reine Funktionen rund um Hostnamen und Mandanten-Kürzel.
 * Kein Datenbankzugriff, damit sie sich leicht testen lassen.
 */

/** Kürzel, die kein Mandant wählen darf, weil die Plattform sie selbst braucht. */
export const RESERVED_SLUGS: ReadonlySet<string> = new Set([
  "www",
  "app",
  "api",
  "admin",
  "mail",
  "smtp",
  "imap",
  "ftp",
  "ns1",
  "ns2",
  "domains",
  "status",
  "docs",
  "help",
  "support",
  "blog",
  "static",
  "assets",
  "cdn",
  "login",
  "auth",
  "account",
  "billing",
  "certifybird",
]);

/** Macht aus einem Host-Header einen vergleichbaren Hostnamen ohne Port. */
export function normalizeHost(value: string | null | undefined): string | null {
  if (!value) return null;
  let host = value.trim().toLowerCase();
  if (!host) return null;
  // Port entfernen (IPv6-Literale wie "[::1]:3000" bleiben in Klammern stehen).
  host = host.startsWith("[")
    ? host.slice(0, host.indexOf("]") + 1)
    : host.split(":")[0];
  if (host.endsWith(".")) host = host.slice(0, -1);
  return host || null;
}

export function isValidSlug(slug: string): boolean {
  return (
    /^[a-z0-9](?:[a-z0-9-]{1,61})[a-z0-9]$/.test(slug) &&
    !slug.includes("--") &&
    !RESERVED_SLUGS.has(slug)
  );
}

/** Schlägt aus einem Namen ein Kürzel vor: "Akademie Müller" -> "akademie-mueller". */
export function slugify(name: string): string {
  return name
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 63)
    .replace(/-+$/g, "");
}

export type HostTarget =
  /** Die Plattform selbst, z. B. certifybird.com oder www.certifybird.com. */
  | { kind: "platform" }
  /** Eine Mandanten-Subdomain unter der Basis-Domain. */
  | { kind: "slug"; slug: string }
  /** Irgendeine andere Domain: möglicherweise eine mitgebrachte Kundendomain. */
  | { kind: "custom"; domain: string }
  /** Unter der Basis-Domain, aber kein gültiger Mandanten-Host. */
  | { kind: "unknown" };

/** Ordnet einen (bereits normalisierten) Hostnamen im SaaS-Modus ein. */
export function classifyHost(hostname: string, baseDomain: string): HostTarget {
  if (hostname === baseDomain || hostname === `www.${baseDomain}`) {
    return { kind: "platform" };
  }
  const suffix = `.${baseDomain}`;
  if (hostname.endsWith(suffix)) {
    const label = hostname.slice(0, -suffix.length);
    if (label.includes(".") || RESERVED_SLUGS.has(label)) {
      return { kind: "unknown" };
    }
    return { kind: "slug", slug: label };
  }
  return { kind: "custom", domain: hostname };
}
