import { seeOther } from "@/lib/auth/request";
import { cnameTarget } from "@/lib/custom-domain";
import { removeCustomDomain } from "@/lib/custom-domain-store";
import { requireOwner } from "@/lib/domain-request";

export async function POST(request: Request) {
  const owner = await requireOwner(request);
  if (owner instanceof Response) return owner;
  const { organization } = owner.member;
  const wasActive = Boolean(organization.customDomain && organization.customDomainVerifiedAt);

  await removeCustomDomain(organization.id);
  if (!wasActive) return seeOther("/admin/domain?removed");
  // War die Domain aktiv, gilt jetzt wieder die Adresse unter der Plattform.
  return seeOther(`https://${cnameTarget(organization.slug, owner.baseDomain)}/login?moved`);
}
