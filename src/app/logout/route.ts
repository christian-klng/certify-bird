import { cookies } from "next/headers";
import { destroySession } from "@/lib/auth/login";
import { isSameOrigin, seeOther, SESSION_COOKIE } from "@/lib/auth/request";

export async function POST(request: Request) {
  if (!isSameOrigin(request)) return new Response(null, { status: 403 });

  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE)?.value;
  if (sessionToken) await destroySession(sessionToken);
  cookieStore.delete(SESSION_COOKIE);
  return seeOther("/login");
}
