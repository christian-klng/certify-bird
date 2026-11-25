import { getRequestContext } from "@/lib/auth/request";
import { issuerProfile } from "@/lib/badges/credential";

/** Das Aussteller-Profil des Mandanten, auf das seine Open Badges verweisen. */
export async function GET() {
  const { tenant, origin } = await getRequestContext();
  if (tenant.kind !== "tenant" || !origin) return new Response(null, { status: 404 });
  return Response.json(issuerProfile(origin, tenant.organization.name), {
    headers: { "Access-Control-Allow-Origin": "*", "Cache-Control": "public, max-age=300" },
  });
}
