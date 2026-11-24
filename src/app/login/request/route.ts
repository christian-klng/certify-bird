import { requestLogin } from "@/lib/auth/login";
import { getRequestContext, isSameOrigin, seeOther } from "@/lib/auth/request";
import { normalizeEmail } from "@/lib/auth/tokens";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return new Response(null, { status: 403 });

  const { tenant, origin } = await getRequestContext();
  if (tenant.kind !== "tenant") return new Response(null, { status: 404 });

  const email = normalizeEmail((await request.formData()).get("email"));
  if (!email) return seeOther("/login?error=email");

  if (!origin) {
    console.error("Anmeldelink nicht möglich: APP_DOMAIN ist nicht gesetzt.");
    return seeOther("/login?error=mail");
  }

  try {
    await requestLogin({ email, organization: tenant.organization, origin });
  } catch (error) {
    console.error("Anmeldelink konnte nicht verschickt werden:", error);
    return seeOther("/login?error=mail");
  }
  return seeOther("/login?sent");
}
