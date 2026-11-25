import { getRequestContext, seeOther } from "@/lib/auth/request";
import { notifyIssuance } from "@/lib/certificates/notify";
import { requireMember } from "@/lib/certificates/request";

export async function POST(request: Request, context: RouteContext<"/admin/zertifikate/[id]/notify">) {
  const member = await requireMember(request);
  if (member instanceof Response) return member;
  const { id } = await context.params;
  const page = `/admin/zertifikate/${id}`;

  const { origin } = await getRequestContext();
  if (!origin) {
    console.error("Benachrichtigung nicht möglich: APP_DOMAIN ist nicht gesetzt.");
    return seeOther(`${page}?error=mail`);
  }

  const result = await notifyIssuance(member.organization.id, id, origin);
  if (!result) return seeOther("/admin/zertifikate");
  return seeOther(`${page}?notified=${result.sent}&failed=${result.failed}`);
}
