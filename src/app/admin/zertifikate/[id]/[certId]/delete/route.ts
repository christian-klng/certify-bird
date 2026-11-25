import { seeOther } from "@/lib/auth/request";
import { deleteCertificate } from "@/lib/certificates/issuances";
import { requireMember } from "@/lib/certificates/request";

export async function POST(
  request: Request,
  context: RouteContext<"/admin/zertifikate/[id]/[certId]/delete">,
) {
  const member = await requireMember(request);
  if (member instanceof Response) return member;
  const { id, certId } = await context.params;

  await deleteCertificate(member.organization.id, id, certId);
  return seeOther(`/admin/zertifikate/${id}?removed`);
}
