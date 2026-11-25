import { seeOther } from "@/lib/auth/request";
import { requireMember } from "@/lib/certificates/request";
import { deleteQuiz } from "@/lib/quizzes/store";

export async function POST(request: Request, context: RouteContext<"/admin/quizzes/[id]/delete">) {
  const member = await requireMember(request);
  if (member instanceof Response) return member;
  const { id } = await context.params;

  await deleteQuiz(member.organization.id, id);
  return seeOther("/admin/quizzes?deleted");
}
