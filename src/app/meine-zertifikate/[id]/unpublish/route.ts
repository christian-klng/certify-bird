import { getCurrentParticipant, rejectForeignOrigin, seeOther } from "@/lib/auth/request";
import { setPublished } from "@/lib/certificates/portal";

export async function POST(
  request: Request,
  context: RouteContext<"/meine-zertifikate/[id]/unpublish">,
) {
  const rejected = rejectForeignOrigin(request);
  if (rejected) return rejected;
  const person = await getCurrentParticipant();
  if (!person) return seeOther("/login");
  const { id } = await context.params;

  const ok = await setPublished(person.organization.id, person.email, id, false);
  return ok ? seeOther("/meine-zertifikate?unpublished") : new Response(null, { status: 404 });
}
