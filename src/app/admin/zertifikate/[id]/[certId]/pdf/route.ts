import { getCurrentMember } from "@/lib/auth/request";
import { certificateValues, findIssuance, issuanceDesign } from "@/lib/certificates/issuances";
import { pdfResponse, renderPdf } from "@/lib/certificates/pdf";

/** Das Zertifikat einer Person als PDF. */
export async function GET(
  _request: Request,
  context: RouteContext<"/admin/zertifikate/[id]/[certId]/pdf">,
) {
  const member = await getCurrentMember();
  if (!member) return new Response(null, { status: 401 });
  const { id, certId } = await context.params;

  const issuance = await findIssuance(member.organization.id, id);
  const certificate = issuance?.certificates.find((c) => c.id === certId);
  if (!issuance || !certificate) return new Response(null, { status: 404 });

  const pdf = await renderPdf(
    issuanceDesign(issuance),
    certificateValues(issuance, certificate.recipientName),
  );
  return pdfResponse(pdf, `${issuance.courseTitle} – ${certificate.recipientName}.pdf`);
}
