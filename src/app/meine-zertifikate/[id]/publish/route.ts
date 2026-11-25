import { getCurrentParticipant, isSameOrigin, seeOther } from "@/lib/auth/request";
import { setPublished } from "@/lib/certificates/portal";

export async function POST(
  request: Request,
  context: RouteContext<"/meine-zertifikate/[id]/publish">,
) {
  if (!isSameOrigin(request)) return new Response(null, { status: 403 });
  const person = await getCurrentParticipant();
  if (!person) return seeOther("/login");
  const { id } = await context.params;

  // Ohne ausdrückliche Einwilligung wird nichts veröffentlicht.
  if ((await request.formData()).get("consent") !== "on") {
    return seeOther("/meine-zertifikate?error=consent");
  }
  const ok = await setPublished(person.organization.id, person.email, id, true);
  return ok ? seeOther("/meine-zertifikate?published") : new Response(null, { status: 404 });
}
