import { connection } from "next/server";
import { readConfig } from "@/lib/config";
import { mayIssueCertificate } from "@/lib/custom-domain-store";
import { normalizeHost } from "@/lib/tenant-host";

/**
 * Für den Reverse Proxy: Darf er für ?domain=… ein TLS-Zertifikat holen?
 * 200 heißt ja, 404 nein. So entstehen Zertifikate nur für Adressen, die zu
 * einem Mandanten gehören, und niemand kann mit beliebigen Domains das
 * Kontingent bei der Zertifizierungsstelle aufbrauchen.
 */
export async function GET(request: Request) {
  // Zur Laufzeit antworten, nicht mit einem beim Bauen erzeugten Ergebnis.
  await connection();
  const config = readConfig();
  if (config.mode !== "saas" || !config.baseDomain) return new Response(null, { status: 404 });
  const domain = normalizeHost(new URL(request.url).searchParams.get("domain"));
  if (!domain) return new Response(null, { status: 404 });
  const allowed = await mayIssueCertificate(domain, config.baseDomain);
  return new Response(null, { status: allowed ? 200 : 404 });
}
