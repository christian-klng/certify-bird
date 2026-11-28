import { addRecipients } from "@/lib/certificates/issuances";
import { issueError, readRecipients, type IssueResponse } from "@/lib/certificates/recipients-request";
import { readJson, requireMember } from "@/lib/certificates/request";

export async function POST(request: Request, context: RouteContext<"/admin/zertifikate/[id]/add">) {
  const member = await requireMember(request);
  if (member instanceof Response) return member;
  const { id } = await context.params;

  const body = (await readJson(request)) as Record<string, unknown> | undefined;
  const recipients = readRecipients(body?.recipients);
  if (recipients instanceof Response) return recipients;

  const result = await addRecipients(member.organization.id, id, recipients);
  if (result.ok) return Response.json({ ok: true, id } satisfies IssueResponse);
  if (result.reason === "not-found") {
    return issueError("Die Kohorte gibt es nicht mehr.", undefined, 404);
  }
  return issueError(
    "Diese Personen sind hier schon eingetragen. Es wurde nichts hinzugefügt.",
    result.emails,
  );
}
