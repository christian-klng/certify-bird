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
    return issueError("Bitte gib den Titel der Weiterbildung ein (höchstens 200 Zeichen).");
  }
  const issuedOn = parseIssueDate(body.issuedOn);
  if (!issuedOn) return issueError("Bitte wähle ein Ausstellungsdatum.");
  if (typeof body.templateId !== "string") return issueError("Bitte wähle eine Vorlage.");

  const recipients = readRecipients(body.recipients);
  if (recipients instanceof Response) return recipients;

  const issuance = await createIssuance(member.organization, {
    templateId: body.templateId,
    courseTitle,
    issuedOn,
    recipients,
  });
  if (!issuance) return issueError("Die Vorlage gibt es nicht mehr.", undefined, 404);
  return Response.json({ ok: true, id: issuance.id } satisfies IssueResponse);
}
