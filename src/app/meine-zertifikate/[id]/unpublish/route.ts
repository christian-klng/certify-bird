import { getCurrentParticipant, isSameOrigin, seeOther } from "@/lib/auth/request";
import { setPublished } from "@/lib/certificates/portal";

export async function POST(
  request: Request,
  context: RouteContext<"/meine-zertifikate/[id]/unpublish">,
) {
  if (!isSameOrigin(request)) return new Response(null, { status: 403 });
  const person = await getCurrentParticipant();
  if (!person) return seeOther("/login");
  const { id } = await context.params;

  const ok = await setPublished(person.organization.id, person.email, id, false);
  return ok ? seeOther("/meine-zertifikate?unpublished") : new Response(null, { status: 404 });
}
