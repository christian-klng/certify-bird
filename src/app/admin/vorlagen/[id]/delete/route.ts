import { seeOther } from "@/lib/auth/request";
import { requireMember } from "@/lib/certificates/request";
import { deleteTemplate } from "@/lib/certificates/templates";

export async function POST(request: Request, context: RouteContext<"/admin/vorlagen/[id]/delete">) {
  const member = await requireMember(request);
  if (member instanceof Response) return member;
  const { id } = await context.params;

  await deleteTemplate(member.organization.id, id);
  return seeOther("/admin/vorlagen?deleted");
}
