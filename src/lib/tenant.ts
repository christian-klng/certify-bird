import type { AppConfig } from "./config";
import { classifyHost, normalizeHost } from "./tenant-host";

/** Die Felder eines Mandanten, die für die Zuordnung per Hostname nötig sind. */
export type TenantOrganization = {
  id: string;
  name: string;
  slug: string;
  customDomain: string | null;
  customDomainVerifiedAt: Date | null;
};

/** Datenzugriff, den die Zuordnung braucht. In Tests durch eine Attrappe ersetzbar. */
export type TenantLookup = {
  /** Der einzige Mandant im Single-Modus (der zuerst angelegte). */
  findFirst(): Promise<TenantOrganization | null>;
  /** Sucht über das aktuelle oder ein früheres Kürzel. */
  findBySlug(slug: string): Promise<TenantOrganization | null>;
  /** Sucht über eine geprüfte mitgebrachte Domain. */
  findByVerifiedCustomDomain(domain: string): Promise<TenantOrganization | null>;
};

export type TenantResolution =
  /** SaaS: Die Anfrage gilt der Plattform selbst, nicht einem Mandanten. */
  | { kind: "platform" }
  /** Single-Modus, aber es wurde noch kein Mandant angelegt. */
  | { kind: "setup" }
  | { kind: "not-found" }
  | {
      kind: "tenant";
      organization: TenantOrganization;
      /**
       * Hostname, unter dem dieser Mandant auftreten soll. null im Single-Modus,
       * dort gilt die Domain, unter der die Instanz läuft.
       */
      canonicalHost: string | null;
      /** false: Die Anfrage kam über eine andere Adresse und sollte umgeleitet werden. */
      isCanonical: boolean;
    };

/** Hostname, unter dem ein Mandant im SaaS-Modus auftritt. */
export function canonicalHostFor(
  organization: TenantOrganization,
  baseDomain: string,
): string {
  return organization.customDomain && organization.customDomainVerifiedAt
    ? organization.customDomain
    : `${organization.slug}.${baseDomain}`;
}

export async function resolveTenant(
  hostHeader: string | null,
  config: AppConfig,
  lookup: TenantLookup,
): Promise<TenantResolution> {
  if (config.mode === "single") {
    const organization = await lookup.findFirst();
    return organization
      ? { kind: "tenant", organization, canonicalHost: null, isCanonical: true }
      : { kind: "setup" };
  }

  const baseDomain = config.baseDomain;
  const hostname = normalizeHost(hostHeader);
  if (!baseDomain || !hostname) return { kind: "not-found" };

  const target = classifyHost(hostname, baseDomain);
  if (target.kind === "platform") return { kind: "platform" };
  if (target.kind === "unknown") return { kind: "not-found" };

  const organization =
    target.kind === "slug"
      ? await lookup.findBySlug(target.slug)
      : await lookup.findByVerifiedCustomDomain(target.domain);
  if (!organization) return { kind: "not-found" };

  const canonicalHost = canonicalHostFor(organization, baseDomain);
  return {
    kind: "tenant",
    organization,
    canonicalHost,
    isCanonical: hostname === canonicalHost,
  };
}
