import { seeOther } from "@/lib/auth/request";
import { findOrganizationByCustomDomain, verifyPendingDomain } from "@/lib/custom-domain-store";
import { requireOwner } from "@/lib/domain-request";

export async function POST(request: Request) {
  const owner = await requireOwner(request);
  if (owner instanceof Response) return owner;
  const { organization } = owner.member;

  const result = await verifyPendingDomain(organization, owner.baseDomain);
  if (!result.ok) {
    if (result.step === "dns" && result.found.length > 0) {
      return seeOther(`/admin/domain?check=dns&found=${encodeURIComponent(result.found[0])}`);
    }
    return seeOther(`/admin/domain?check=${result.step}`);
  }

  // Ab jetzt ist der Mandant nur noch unter seiner Domain erreichbar. Die
  // Sitzung gilt dort nicht: weiter zur Anmeldung unter der neuen Adresse.
  const domain = organization.customDomain;
  const current = domain ? await findOrganizationByCustomDomain(domain) : null;
  if (!domain || current?.id !== organization.id) return seeOther("/admin/domain");
  return seeOther(`https://${domain}/login?moved`);
}
