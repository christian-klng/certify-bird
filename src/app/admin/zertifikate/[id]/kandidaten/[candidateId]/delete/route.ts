import { seeOther } from "@/lib/auth/request";
import { requireMember } from "@/lib/certificates/request";
import { deleteCandidate } from "@/lib/quizzes/candidates";

export async function POST(
  request: Request,
  context: RouteContext<"/admin/zertifikate/[id]/kandidaten/[candidateId]/delete">,
) {
  const member = await requireMember(request);
  if (member instanceof Response) return member;
  const { id, candidateId } = await context.params;

  await deleteCandidate(member.organization.id, id, candidateId);
  return seeOther(`/admin/zertifikate/${id}?candidateRemoved`);
}
