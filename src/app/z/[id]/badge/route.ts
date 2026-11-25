import { getRequestContext } from "@/lib/auth/request";
import { badgeResponse, signedBadge } from "@/lib/badges/issue";
import { findPublishedCertificate } from "@/lib/certificates/public";

/** Das Open Badge eines veröffentlichten Zertifikats. */
export async function GET(_request: Request, context: RouteContext<"/z/[id]/badge">) {
  const { tenant, origin } = await getRequestContext();
  if (tenant.kind !== "tenant" || !origin) return new Response(null, { status: 404 });
  const { id } = await context.params;

  const certificate = await findPublishedCertificate(tenant.organization.id, id);
  if (!certificate) return new Response(null, { status: 404 });
  return badgeResponse(
    await signedBadge(origin, certificate),
    `${certificate.issuance.courseTitle} – ${certificate.recipientName}.openbadge.jwt`,
  );
}
