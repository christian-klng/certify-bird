import { seeOther } from "@/lib/auth/request";
import { normalizeName } from "@/lib/certificates/design";
import { requireMember } from "@/lib/certificates/request";
import { createQuiz } from "@/lib/quizzes/store";

export async function POST(request: Request) {
  const member = await requireMember(request);
  if (member instanceof Response) return member;

  const name = normalizeName((await request.formData()).get("name"));
  if (!name) return seeOther("/admin/quizzes?error=name");

  const quiz = await createQuiz(member.organization.id, name);
  return seeOther(`/admin/quizzes/${quiz.id}`);
}
