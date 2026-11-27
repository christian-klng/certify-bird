import { getCurrentMember, rejectForeignOrigin, type CurrentMember } from "./auth/request";
import { readConfig } from "./config";

/**
 * Gemeinsame Prüfung für die Domain-Routen: eigene Herkunft, SaaS-Modus und
 * Inhaber des Mandanten. Liefert sonst die passende Fehlerantwort.
 */
export async function requireOwner(
  request: Request,
): Promise<{ member: CurrentMember; baseDomain: string } | Response> {
  const rejected = rejectForeignOrigin(request);
  if (rejected) return rejected;
  const config = readConfig();
  if (config.mode !== "saas" || !config.baseDomain) return new Response(null, { status: 404 });
  const member = await getCurrentMember();
  if (!member) return new Response(null, { status: 401 });
  if (member.role !== "OWNER") return new Response(null, { status: 403 });
  return { member, baseDomain: config.baseDomain };
}
