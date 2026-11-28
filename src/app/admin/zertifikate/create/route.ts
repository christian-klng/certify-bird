import { createIssuance, MAX_COURSE_TITLE_LENGTH } from "@/lib/certificates/issuances";
import { parseIssueDate } from "@/lib/certificates/recipients";
import { issueError, readRecipients, type IssueResponse } from "@/lib/certificates/recipients-request";
import { readJson, requireMember } from "@/lib/certificates/request";

export async function POST(request: Request) {
  const member = await requireMember(request);
  if (member instanceof Response) return member;

  const body = (await readJson(request)) as Record<string, unknown> | undefined;
  if (!body || typeof body !== "object") return issueError("Die Eingabe ist unlesbar.");

  const courseTitle = typeof body.courseTitle === "string" ? body.courseTitle.trim() : "";
  if (!courseTitle || courseTitle.length > MAX_COURSE_TITLE_LENGTH) {
    return issueError("Bitte gib den Namen des Kurses ein (höchstens 200 Zeichen).");
  }
  const issuedOn = parseIssueDate(body.issuedOn);
  if (!issuedOn) return issueError("Bitte wähle ein Ausstellungsdatum.");
  if (typeof body.templateId !== "string") return issueError("Bitte wähle eine Vorlage.");

  const quizId = typeof body.quizId === "string" && body.quizId ? body.quizId : null;

  const recipients = readRecipients(body.recipients ?? "", { allowEmpty: true });
  if (recipients instanceof Response) return recipients;

  const issuance = await createIssuance(member.organization, {
    templateId: body.templateId,
    quizId,
    courseTitle,
    issuedOn,
    recipients,
  });
  if (!issuance.ok) {
    if (issuance.reason === "no-template") {
      return issueError("Die Vorlage gibt es nicht mehr.", undefined, 404);
    }
    if (issuance.reason === "no-quiz") return issueError("Das Quiz gibt es nicht mehr.", undefined, 404);
    return issueError("Das Quiz hat noch keine Fragen.");
  }
  return Response.json({ ok: true, id: issuance.id } satisfies IssueResponse);
}
