import { getCurrentParticipant, isSameOrigin, seeOther } from "@/lib/auth/request";
import { submitAttempt } from "@/lib/quizzes/candidates";

/** Liest die angekreuzten Antworten: Felder heißen wie die Frage, Werte wie die Antwort. */
function readAnswers(form: FormData): Record<string, string[]> {
  const answers: Record<string, string[]> = {};
  for (const [name, value] of form.entries()) {
    if (typeof value !== "string" || !/^q\d+$/.test(name)) continue;
    (answers[name] ??= []).push(value);
  }
  return answers;
}

export async function POST(
  request: Request,
  context: RouteContext<"/meine-zertifikate/quiz/[id]/submit">,
) {
  if (!isSameOrigin(request)) return new Response(null, { status: 403 });
  const person = await getCurrentParticipant();
  if (!person) return seeOther("/login");
  const { id } = await context.params;
  const page = `/meine-zertifikate/quiz/${id}`;

  const result = await submitAttempt(
    person.organization.id,
    person.email,
    id,
    readAnswers(await request.formData()),
  );
  switch (result.kind) {
    case "passed":
      return seeOther("/meine-zertifikate?passed");
    case "failed":
      return seeOther(`${page}?failed`);
    case "exhausted":
      return seeOther(page);
    case "not-found":
      return seeOther("/meine-zertifikate");
  }
}
