import { getCurrentParticipant } from "@/lib/auth/request";
import { certificateValues, issuanceDesign } from "@/lib/certificates/issuances";
import { pdfResponse, renderPdf } from "@/lib/certificates/pdf";
import { findOwnCertificate } from "@/lib/certificates/portal";

/** Das eigene Zertifikat als PDF. */
export async function GET(_request: Request, context: RouteContext<"/meine-zertifikate/[id]/pdf">) {
  const person = await getCurrentParticipant();
  if (!person) return new Response(null, { status: 401 });
  const { id } = await context.params;

  const certificate = await findOwnCertificate(person.organization.id, person.email, id);
  if (!certificate) return new Response(null, { status: 404 });

  const pdf = await renderPdf(
    issuanceDesign(certificate.issuance),
    certificateValues(certificate.issuance, certificate.recipientName),
  );
  return pdfResponse(pdf, `${certificate.issuance.courseTitle} – ${certificate.recipientName}.pdf`);
}
