import { createHash } from "node:crypto";
import { normalizeHost } from "./tenant-host";

/**
 * Eigene Domain eines Mandanten im SaaS-Modus. Reine Logik ohne Datenbank;
 * DNS-Abfrage und HTTPS-Abruf werden hereingereicht, damit sie testbar sind.
 */

/**
 * Bringt eine Eingabe wie "https://Zertifikate.Akademie.de/" in Form und prüft
 * sie. Erlaubt sind nur Subdomains fremder Domains: Eine Hauptdomain kann
 * keinen CNAME tragen, und Adressen unter der Plattform-Domain gehören ihr.
 */
export function normalizeCustomDomain(input: unknown, baseDomain: string): string | null {
  if (typeof input !== "string") return null;
  const stripped = input.trim().replace(/^[a-z]+:\/\//i, "").split(/[/?#]/)[0];
  const domain = normalizeHost(stripped);
  if (!domain || domain.length > 253) return null;
  const labels = domain.split(".");
  if (labels.length < 3) return null;
  if (!labels.every((label) => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/.test(label))) return null;
  // Die Endung muss Buchstaben enthalten: schließt IP-Adressen aus.
  if (!/[a-z]/.test(labels[labels.length - 1])) return null;
  if (domain === baseDomain || domain.endsWith(`.${baseDomain}`)) return null;
  if (domain.endsWith(".localhost") || domain.endsWith(".local") || domain.endsWith(".internal")) {
    return null;
  }
  return domain;
}

/** Wohin der CNAME des Mandanten zeigen muss. */
export function cnameTarget(slug: string, baseDomain: string): string {
  return `${slug}.${baseDomain}`;
}

/**
 * Kennzeichen, mit dem die Instanz unter einer Domain beweist, dass sie
 * diese dem Mandanten zuordnet. Verrät die interne ID nicht.
 */
export function domainToken(organizationId: string): string {
  return createHash("sha256").update(`domain-check:${organizationId}`).digest("hex").slice(0, 32);
}

export type DomainCheckDeps = {
  /** CNAME-Einträge eines Hostnamens; leer, wenn es keine gibt. */
  resolveCname(hostname: string): Promise<string[]>;
  /** Ruft https://<domain>/api/domain-check ab und liefert das Kennzeichen oder null. */
  probe(domain: string): Promise<string | null>;
};

export type DomainCheckResult =
  | { ok: true }
  | { ok: false; step: "dns"; found: string[] }
  | { ok: false; step: "https" };

/**
 * Prüft eine eigene Domain in zwei Schritten:
 * 1. DNS: Der CNAME zeigt auf die Adresse genau dieses Mandanten. Das beweist,
 *    dass er die Domain kontrolliert und sie ihm zuordnen will.
 * 2. HTTPS: Die Instanz antwortet unter der Domain mit gültigem Zertifikat.
 *    Erst dann wird umgestellt, sonst wäre der Mandant nicht mehr erreichbar.
 */
export async function checkCustomDomain(
  input: { domain: string; target: string; token: string },
  deps: DomainCheckDeps,
): Promise<DomainCheckResult> {
  const found = (await deps.resolveCname(input.domain).catch(() => []))
    .map((name) => normalizeHost(name))
    .filter((name): name is string => name !== null);
  if (!found.includes(input.target)) return { ok: false, step: "dns", found };

  const token = await deps.probe(input.domain).catch(() => null);
  if (token !== input.token) return { ok: false, step: "https" };
  return { ok: true };
}
