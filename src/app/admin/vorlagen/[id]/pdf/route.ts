import { checkDesign, sampleValues } from "@/lib/certificates/design";
import { pdfResponse, renderPdf } from "@/lib/certificates/pdf";
import { readJson, requireMember } from "@/lib/certificates/request";

/**
 * Vorschau: erzeugt aus der mitgeschickten, noch nicht gespeicherten
 * Gestaltung ein PDF mit Beispieldaten.
 */
export async function POST(request: Request) {
  const member = await requireMember(request);
  if (member instanceof Response) return member;

  const checked = checkDesign(await readJson(request));
  if (!checked.ok) return new Response(checked.error, { status: 400 });

  try {
    const pdf = await renderPdf(checked.design, sampleValues(member.organization.name));
    return pdfResponse(pdf, "vorschau.pdf");
  } catch (error) {
    console.error("Vorschau-PDF konnte nicht erzeugt werden:", error);
    return new Response("Das PDF konnte nicht erzeugt werden.", { status: 500 });
  }
}
