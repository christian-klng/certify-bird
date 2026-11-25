import {
  checkDesign,
  MAX_DESCRIPTION_LENGTH,
  normalizeName,
} from "@/lib/certificates/design";
import { readJson, requireMember } from "@/lib/certificates/request";
import { updateTemplate } from "@/lib/certificates/templates";

export async function POST(request: Request, context: RouteContext<"/admin/vorlagen/[id]/save">) {
  const member = await requireMember(request);
  if (member instanceof Response) return member;
  const { id } = await context.params;

  const body = (await readJson(request)) as
    | { name?: unknown; description?: unknown; design?: unknown }
    | undefined;
  if (!body || typeof body !== "object") {
    return new Response("Die Vorlage ist zu groß oder unlesbar.", { status: 400 });
  }

  const name = normalizeName(body.name);
  if (!name) return new Response("Bitte gib der Vorlage einen Namen.", { status: 400 });

  const description = typeof body.description === "string" ? body.description.trim() : "";
  if (description.length > MAX_DESCRIPTION_LENGTH) {
    return new Response("Die Beschreibung ist zu lang.", { status: 400 });
  }

  const checked = checkDesign(body.design);
  if (!checked.ok) return new Response(checked.error, { status: 400 });

  const saved = await updateTemplate(member.organization.id, id, {
    name,
    description,
    design: checked.design,
  });
  if (!saved) return new Response("Die Vorlage gibt es nicht mehr.", { status: 404 });
  return new Response(null, { status: 204 });
}
