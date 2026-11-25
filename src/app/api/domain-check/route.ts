import { connection } from "next/server";
import { domainToken } from "@/lib/custom-domain";
import { findOrganizationByCustomDomain } from "@/lib/custom-domain-store";
import { normalizeHost } from "@/lib/tenant-host";

/**
 * Antwortet unter einer eigenen Domain mit dem Kennzeichen des Mandanten, dem
 * sie zugeordnet ist. Damit prüft die Instanz vor dem Umstellen, dass sie
 * unter der Domain mit gültigem Zertifikat erreichbar ist. Läuft am Proxy
 * vorbei, weil eine vorgemerkte Domain dort noch als unbekannt gilt.
 */
export async function GET(request: Request) {
  // Zur Laufzeit antworten, nicht mit einem beim Bauen erzeugten Ergebnis.
  await connection();
  const host = normalizeHost(request.headers.get("host"));
  const organization = host ? await findOrganizationByCustomDomain(host) : null;
  if (!organization) return new Response(null, { status: 404 });
  return Response.json(
    { token: domainToken(organization.id) },
    { headers: { "Cache-Control": "no-store" } },
  );
}
