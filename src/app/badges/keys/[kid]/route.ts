import { findPublicKey } from "@/lib/badges/keys";
import { getCurrentTenant } from "@/lib/current-tenant";

/** Öffentlicher Schlüssel, mit dem sich die Signatur eines Badges prüfen lässt. */
export async function GET(_request: Request, context: RouteContext<"/badges/keys/[kid]">) {
  const tenant = await getCurrentTenant();
  if (tenant.kind !== "tenant") return new Response(null, { status: 404 });
  const { kid } = await context.params;

  const key = await findPublicKey(tenant.organization.id, kid);
  if (!key) return new Response(null, { status: 404 });
  return Response.json(
    { ...key.publicJwk, kid: key.id, use: "sig", alg: "RS256" },
    { headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=300" } },
  );
}
