import { seeOther } from "@/lib/auth/request";
import { deleteIssuance } from "@/lib/certificates/issuances";
import { requireMember } from "@/lib/certificates/request";

export async function POST(request: Request, context: RouteContext<"/admin/zertifikate/[id]/delete">) {
  const member = await requireMember(request);
  if (member instanceof Response) return member;
  const { id } = await context.params;

  await deleteIssuance(member.organization.id, id);
  return seeOther("/admin/zertifikate?deleted");
}
