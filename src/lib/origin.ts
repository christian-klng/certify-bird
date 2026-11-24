import type { AppConfig } from "./config";
import type { TenantResolution } from "./tenant";
import { normalizeHost } from "./tenant-host";

/**
 * Hostname, unter dem die aktuelle Anfrage öffentlich erreichbar sein soll.
 * Er stammt aus der Konfiguration oder aus der Mandantenzuordnung, nie
 * ungeprüft aus dem Host-Header: Sonst könnte jemand mit einem gefälschten
 * Header Anmeldelinks auf eine fremde Domain in fremde Postfächer schicken.
 */
export function trustedHostname(
  config: AppConfig,
  tenant: TenantResolution,
): string | null {
  if (config.mode === "single") return config.baseDomain;
  if (tenant.kind === "tenant") return tenant.canonicalHost;
  if (tenant.kind === "platform") return config.baseDomain;
  return null;
}

/**
 * Baut die Basisadresse für Links in E-Mails.
 * Im Produktivbetrieb immer https und nur mit vertrauenswürdigem Hostnamen.
 * In der Entwicklung http mit dem Port der Anfrage; fehlt ein konfigurierter
 * Hostname, wird dort ersatzweise der Host der Anfrage genommen.
 */
export function buildOrigin(
  hostname: string | null,
  requestHost: string | null,
  production: boolean,
): string | null {
  if (production) return hostname ? `https://${hostname}` : null;
  const port = /:\d+$/.exec(requestHost ?? "")?.[0] ?? "";
  const effective = hostname ?? normalizeHost(requestHost);
  return effective ? `http://${effective}${port}` : null;
}
