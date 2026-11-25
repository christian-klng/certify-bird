import { certificateValues, issuanceDesign } from "@/lib/certificates/issuances";
import { pdfResponse, renderPdf } from "@/lib/certificates/pdf";
import { findPublishedCertificate } from "@/lib/certificates/public";
import { getCurrentTenant } from "@/lib/current-tenant";

/** Das PDF eines veröffentlichten Zertifikats. */
export async function GET(_request: Request, context: RouteContext<"/z/[id]/pdf">) {
  const tenant = await getCurrentTenant();
  if (tenant.kind !== "tenant") return new Response(null, { status: 404 });
  const { id } = await context.params;

  const certificate = await findPublishedCertificate(tenant.organization.id, id);
  if (!certificate) return new Response(null, { status: 404 });

  const pdf = await renderPdf(
    issuanceDesign(certificate.issuance),
    certificateValues(certificate.issuance, certificate.recipientName),
  );
  return pdfResponse(pdf, `${certificate.issuance.courseTitle} – ${certificate.recipientName}.pdf`);
}
