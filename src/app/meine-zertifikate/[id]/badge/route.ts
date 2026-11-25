import { getCurrentParticipant, getRequestContext } from "@/lib/auth/request";
import { badgeResponse, signedBadge } from "@/lib/badges/issue";
import { findOwnCertificate } from "@/lib/certificates/portal";

/** Das eigene Open Badge. Es gehört der Person, auch ohne öffentliche Seite. */
export async function GET(_request: Request, context: RouteContext<"/meine-zertifikate/[id]/badge">) {
  const person = await getCurrentParticipant();
  if (!person) return new Response(null, { status: 401 });
  const { origin } = await getRequestContext();
  if (!origin) return new Response(null, { status: 404 });
  const { id } = await context.params;

  const certificate = await findOwnCertificate(person.organization.id, person.email, id);
  if (!certificate) return new Response(null, { status: 404 });
  return badgeResponse(
    await signedBadge(origin, certificate),
    `${certificate.issuance.courseTitle} – ${certificate.recipientName}.openbadge.jwt`,
  );
}
