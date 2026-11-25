import { cookies } from "next/headers";
import { confirmLoginToken } from "@/lib/auth/login";
import {
  getRequestContext,
  isSameOrigin,
  originForSlug,
  seeOther,
  SESSION_COOKIE,
} from "@/lib/auth/request";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return new Response(null, { status: 403 });

  const { tenant } = await getRequestContext();
  const token = (await request.formData()).get("token");
  if (typeof token !== "string" || !token) return seeOther("/login/verify");

  const context =
    tenant.kind === "tenant"
      ? ({ kind: "tenant", organizationId: tenant.organization.id } as const)
      : tenant.kind === "platform"
        ? ({ kind: "platform" } as const)
        : null;
  if (!context) return new Response(null, { status: 404 });

  const result = await confirmLoginToken(token, context);

  if (result.kind === "session") {
    (await cookies()).set(SESSION_COOKIE, result.sessionToken, {
      httpOnly: true,
      sameSite: "lax",
      secure: process.env.NODE_ENV === "production",
      path: "/",
      expires: result.expiresAt,
    });
    return seeOther(result.role === "member" ? "/admin" : "/meine-zertifikate");
  }

  if (result.kind === "registered") {
    const origin = await originForSlug(result.slug);
    if (!origin) return seeOther("/login/verify");
    return seeOther(`${origin}/login/verify?token=${result.loginToken}`);
  }

  return seeOther(
    result.kind === "slug-taken" ? "/login/verify?error=slug-taken" : "/login/verify",
  );
}
