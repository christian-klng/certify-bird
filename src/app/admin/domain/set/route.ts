import { seeOther } from "@/lib/auth/request";
import { normalizeCustomDomain } from "@/lib/custom-domain";
import { setPendingDomain } from "@/lib/custom-domain-store";
import { requireOwner } from "@/lib/domain-request";

export async function POST(request: Request) {
  const owner = await requireOwner(request);
  if (owner instanceof Response) return owner;

  const domain = normalizeCustomDomain((await request.formData()).get("domain"), owner.baseDomain);
  if (!domain) return seeOther("/admin/domain?error=invalid");

  const result = await setPendingDomain(owner.member.organization.id, domain);
  return seeOther(result === "taken" ? "/admin/domain?error=taken" : "/admin/domain");
}
