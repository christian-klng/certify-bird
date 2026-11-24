import { requestRegistration } from "@/lib/auth/login";
import { getRequestContext, isSameOrigin, seeOther } from "@/lib/auth/request";
import { normalizeEmail } from "@/lib/auth/tokens";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return new Response(null, { status: 403 });

  const { tenant, origin } = await getRequestContext();
  if (tenant.kind !== "platform") return new Response(null, { status: 404 });

  const form = await request.formData();
  const email = normalizeEmail(form.get("email"));
  if (!email) return seeOther("/register?error=email");
  if (!origin) return seeOther("/register?error=mail");

  try {
    const result = await requestRegistration({
      email,
      orgName: String(form.get("name") ?? ""),
      slug: String(form.get("slug") ?? "").trim().toLowerCase(),
      origin,
    });
    if (!result.ok) return seeOther(`/register?error=${result.error}`);
  } catch (error) {
    console.error("Registrierungslink konnte nicht verschickt werden:", error);
    return seeOther("/register?error=mail");
  }
  return seeOther("/register?sent");
}
