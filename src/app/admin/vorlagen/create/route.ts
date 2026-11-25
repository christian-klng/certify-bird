import { seeOther } from "@/lib/auth/request";
import { normalizeName } from "@/lib/certificates/design";
import { requireMember } from "@/lib/certificates/request";
import { createTemplate } from "@/lib/certificates/templates";

export async function POST(request: Request) {
  const member = await requireMember(request);
  if (member instanceof Response) return member;

  const name = normalizeName((await request.formData()).get("name"));
  if (!name) return seeOther("/admin/vorlagen?error=name");

  const template = await createTemplate(member.organization.id, name);
  return seeOther(`/admin/vorlagen/${template.id}`);
}
