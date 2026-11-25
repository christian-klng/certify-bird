import { normalizeName } from "@/lib/certificates/design";
import { readJson, requireMember } from "@/lib/certificates/request";
import { checkQuiz } from "@/lib/quizzes/quiz";
import { updateQuiz } from "@/lib/quizzes/store";

export async function POST(request: Request, context: RouteContext<"/admin/quizzes/[id]/save">) {
  const member = await requireMember(request);
  if (member instanceof Response) return member;
  const { id } = await context.params;

  const body = (await readJson(request)) as { name?: unknown; content?: unknown } | undefined;
  if (!body || typeof body !== "object") {
    return new Response("Das Quiz ist unlesbar.", { status: 400 });
  }

  const name = normalizeName(body.name);
  if (!name) return new Response("Bitte gib dem Quiz einen Namen.", { status: 400 });

  const checked = checkQuiz(body.content);
  if (!checked.ok) return new Response(checked.error, { status: 400 });

  const saved = await updateQuiz(member.organization.id, id, { name, content: checked.content });
  if (!saved) return new Response("Das Quiz gibt es nicht mehr.", { status: 404 });
  return new Response(null, { status: 204 });
}
