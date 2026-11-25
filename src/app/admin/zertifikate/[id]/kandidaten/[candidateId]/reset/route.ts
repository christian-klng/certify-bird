import { seeOther } from "@/lib/auth/request";
import { requireMember } from "@/lib/certificates/request";
import { resetAttempts } from "@/lib/quizzes/candidates";

export async function POST(
  request: Request,
  context: RouteContext<"/admin/zertifikate/[id]/kandidaten/[candidateId]/reset">,
) {
  const member = await requireMember(request);
  if (member instanceof Response) return member;
  const { id, candidateId } = await context.params;

  await resetAttempts(member.organization.id, id, candidateId);
  return seeOther(`/admin/zertifikate/${id}?attemptsReset`);
}
