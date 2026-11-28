import { getCurrentMember } from "@/lib/auth/request";
import { certificateValues, findIssuance, issuanceDesign } from "@/lib/certificates/issuances";
import { pdfResponse, renderPdfs } from "@/lib/certificates/pdf";

/** Alle Zertifikate einer Kohorte in einem PDF, zum Drucken. */
export async function GET(_request: Request, context: RouteContext<"/admin/zertifikate/[id]/pdf">) {
  const member = await getCurrentMember();
  if (!member) return new Response(null, { status: 401 });
  const { id } = await context.params;

  const issuance = await findIssuance(member.organization.id, id);
  if (!issuance || issuance.certificates.length === 0) return new Response(null, { status: 404 });

  const pdf = await renderPdfs(
    issuanceDesign(issuance),
    issuance.certificates.map((c) => certificateValues(issuance, c.recipientName)),
  );
  return pdfResponse(pdf, `${issuance.courseTitle} – alle Zertifikate.pdf`);
}
