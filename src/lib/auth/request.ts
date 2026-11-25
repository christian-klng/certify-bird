import { cookies, headers } from "next/headers";
import { readConfig } from "../config";
import { getCurrentTenant } from "../current-tenant";
import { buildOrigin, trustedHostname } from "../origin";
import type { TenantOrganization, TenantResolution } from "../tenant";
import { findMember, findSessionUser } from "./login";

export const SESSION_COOKIE = "cb_session";

/** Schutz vor fremden Formularen: Der Origin-Header muss zum Host der Anfrage passen. */
export function isSameOrigin(request: Request): boolean {
  const origin = request.headers.get("origin");
  if (!origin) return false;
  try {
    return new URL(origin).host.toLowerCase() === (request.headers.get("host") ?? "").toLowerCase();
  } catch {
    return false;
  }
}

/** Antwort, die den Browser nach einem Formular auf eine Seite derselben Adresse schickt. */
export function seeOther(location: string): Response {
  return new Response(null, { status: 303, headers: { Location: location } });
}

/** Mandant der Anfrage und die Basisadresse für Links in E-Mails (null, wenn nicht ermittelbar). */
export async function getRequestContext(): Promise<{
  tenant: TenantResolution;
  origin: string | null;
}> {
  const config = readConfig();
  const tenant = await getCurrentTenant();
  const requestHost = (await headers()).get("host");
  return {
    tenant,
    origin: buildOrigin(
      trustedHostname(config, tenant),
      requestHost,
      process.env.NODE_ENV === "production",
    ),
  };
}

/** Basisadresse eines Mandanten anhand seines Kürzels (für die Weiterleitung nach der Registrierung). */
export async function originForSlug(slug: string): Promise<string | null> {
  const config = readConfig();
  if (!config.baseDomain) return null;
  const requestHost = (await headers()).get("host");
  // Der Port der Anfrage wird nur in der Entwicklung übernommen.
  return buildOrigin(
    `${slug}.${config.baseDomain}`,
    requestHost,
    process.env.NODE_ENV === "production",
  );
}

export type CurrentMember = {
  userId: string;
  email: string;
  role: "OWNER" | "MEMBER";
  organization: TenantOrganization;
};

/**
 * Die angemeldete Person, sofern sie dem Mandanten der Anfrage angehört.
 * Jede geschützte Seite und Aktion muss das selbst prüfen; die Umleitung im
 * Proxy ist nur Komfort.
 */
export async function getCurrentMember(): Promise<CurrentMember | null> {
  const tenant = await getCurrentTenant();
  if (tenant.kind !== "tenant") return null;
  const sessionToken = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!sessionToken) return null;
  const member = await findMember(sessionToken, tenant.organization.id);
  return member ? { ...member, organization: tenant.organization } : null;
}

export type CurrentParticipant = {
  email: string;
  /** Ob die Person zusätzlich zur Verwaltung des Mandanten gehört. */
  isMember: boolean;
  organization: TenantOrganization;
};

/**
 * Die angemeldete Person beim Mandanten der Anfrage, egal ob Mitglied oder
 * nur mit Zertifikat. Welche Zertifikate sie sehen darf, ergibt sich aus
 * ihrer E-Mail-Adresse.
 */
export async function getCurrentParticipant(): Promise<CurrentParticipant | null> {
  const tenant = await getCurrentTenant();
  if (tenant.kind !== "tenant") return null;
  const sessionToken = (await cookies()).get(SESSION_COOKIE)?.value;
  if (!sessionToken) return null;
  const user = await findSessionUser(sessionToken);
  if (!user) return null;
  const member = await findMember(sessionToken, tenant.organization.id);
  return { email: user.email, isMember: member !== null, organization: tenant.organization };
}
