import { connection } from "next/server";
import { readConfig } from "@/lib/config";
import { db } from "@/lib/db";
import { traefikConfig } from "@/lib/traefik-config";

/**
 * Für Traefik als Reverse Proxy (HTTP-Provider): die Router für alle eigenen
 * Domains, auch vorgemerkte, damit ihr Zertifikat vor der Prüfung entsteht.
 * Nur aktiv, wenn TRAEFIK_SERVICE_URL gesetzt ist.
 */
export async function GET() {
  // Zur Laufzeit antworten, nicht mit einem beim Bauen erzeugten Ergebnis.
  await connection();
  const serviceUrl = process.env.TRAEFIK_SERVICE_URL?.trim();
  if (!serviceUrl || readConfig().mode !== "saas") return new Response(null, { status: 404 });

  const organizations = await db().organization.findMany({
    where: { customDomain: { not: null } },
    select: { customDomain: true },
  });
  return Response.json(
    traefikConfig({
      domains: organizations.map((o) => o.customDomain!),
      serviceUrl,
      certResolver: process.env.TRAEFIK_CERT_RESOLVER?.trim() || "letsencrypt",
    }),
    { headers: { "Cache-Control": "no-store" } },
  );
}
