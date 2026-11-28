import { seeOther } from "@/lib/auth/request";
import { issueCertificates } from "@/lib/certificates/issuances";
import { parseIssueDate } from "@/lib/certificates/recipients";
import { requireMember } from "@/lib/certificates/request";

/** Stellt den angekreuzten Personen einer Kohorte ihr Zertifikat aus. */
export async function POST(
  request: Request,
  context: RouteContext<"/admin/zertifikate/[id]/ausstellen">,
) {
  const member = await requireMember(request);
  if (member instanceof Response) return member;
  const { id } = await context.params;
  const base = `/admin/zertifikate/${id}`;

  const form = await request.formData();
  const candidateIds = form.getAll("candidate").filter((v): v is string => typeof v === "string");
  if (candidateIds.length === 0) return seeOther(`${base}?error=nobody`);

  // Das Datum steht nur im Formular, solange die Kohorte noch kein Zertifikat hat.
  const rawDate = form.get("issuedOn");
  const issuedOn = rawDate === null ? null : parseIssueDate(rawDate);
  if (rawDate !== null && !issuedOn) return seeOther(`${base}?error=date`);

  const result = await issueCertificates(member.organization.id, id, { candidateIds, issuedOn });
  if (result.ok) return seeOther(`${base}?issued=${result.issued}`);
  if (result.reason === "not-found") return seeOther("/admin/zertifikate");
  return seeOther(`${base}?error=${result.reason}`);
}
