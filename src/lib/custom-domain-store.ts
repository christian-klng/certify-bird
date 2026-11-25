import { resolveCname } from "node:dns/promises";
import { db } from "./db";
import {
  checkCustomDomain,
  cnameTarget,
  domainToken,
  type DomainCheckDeps,
  type DomainCheckResult,
} from "./custom-domain";

/** Der Mandant, dem eine eigene Domain zugeordnet ist, geprüft oder noch nicht. */
export function findOrganizationByCustomDomain(domain: string) {
  return db().organization.findUnique({
    where: { customDomain: domain },
    select: { id: true, slug: true, customDomainVerifiedAt: true },
  });
}

/**
 * Merkt eine eigene Domain für den Mandanten vor. Sie gilt erst nach der
 * Prüfung. Hat ein anderer Mandant sie nur vorgemerkt, verliert er sie: Wem
 * die Domain gehört, entscheidet allein der CNAME.
 */
export async function setPendingDomain(
  organizationId: string,
  domain: string,
): Promise<"ok" | "taken"> {
  return db().$transaction(async (tx) => {
    const other = await tx.organization.findUnique({
      where: { customDomain: domain },
      select: { id: true, customDomainVerifiedAt: true },
    });
    if (other && other.id !== organizationId) {
      if (other.customDomainVerifiedAt) return "taken";
      await tx.organization.update({ where: { id: other.id }, data: { customDomain: null } });
    }
    await tx.organization.update({
      where: { id: organizationId },
      data: { customDomain: domain, customDomainVerifiedAt: null },
    });
    return "ok";
  });
}

export async function removeCustomDomain(organizationId: string): Promise<void> {
  await db().organization.update({
    where: { id: organizationId },
    data: { customDomain: null, customDomainVerifiedAt: null },
  });
}

const realDeps: DomainCheckDeps = {
  resolveCname: (hostname) => resolveCname(hostname),
  async probe(domain) {
    // Feste Adresse, kein Folgen von Weiterleitungen, kurze Frist: Der Abruf
    // geht nur an die Domain, deren CNAME gerade auf uns zeigt.
    const response = await fetch(`https://${domain}/api/domain-check`, {
      redirect: "manual",
      signal: AbortSignal.timeout(8000),
      cache: "no-store",
    });
    if (!response.ok) return null;
    const body = (await response.json()) as { token?: unknown };
    return typeof body.token === "string" ? body.token : null;
  },
};

/** Prüft die vorgemerkte Domain des Mandanten und schaltet sie bei Erfolg frei. */
export async function verifyPendingDomain(
  organization: { id: string; slug: string },
  baseDomain: string,
): Promise<DomainCheckResult | { ok: false; step: "none" }> {
  const current = await db().organization.findUnique({
    where: { id: organization.id },
    select: { customDomain: true },
  });
  if (!current?.customDomain) return { ok: false, step: "none" };

  const result = await checkCustomDomain(
    {
      domain: current.customDomain,
      target: cnameTarget(organization.slug, baseDomain),
      token: domainToken(organization.id),
    },
    realDeps,
  );
  if (result.ok) {
    // Nur freischalten, wenn die Domain inzwischen nicht geändert wurde.
    await db().organization.updateMany({
      where: { id: organization.id, customDomain: current.customDomain },
      data: { customDomainVerifiedAt: new Date() },
    });
  }
  return result;
}

/**
 * Ob für einen Hostnamen ein TLS-Zertifikat ausgestellt werden darf: für die
 * Plattform, für Adressen bestehender Mandanten und für eigene Domains, auch
 * vorgemerkte (das Zertifikat muss vor der Prüfung da sein).
 */
export async function mayIssueCertificate(hostname: string, baseDomain: string): Promise<boolean> {
  if (hostname === baseDomain || hostname === `www.${baseDomain}`) return true;
  const suffix = `.${baseDomain}`;
  if (hostname.endsWith(suffix)) {
    const slug = hostname.slice(0, -suffix.length);
    if (slug.includes(".")) return false;
    const [current, retired] = await Promise.all([
      db().organization.findUnique({ where: { slug }, select: { id: true } }),
      db().retiredSlug.findUnique({ where: { slug }, select: { slug: true } }),
    ]);
    return Boolean(current || retired);
  }
  return (await findOrganizationByCustomDomain(hostname)) !== null;
}
