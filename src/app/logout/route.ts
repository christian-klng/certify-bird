import { cookies } from "next/headers";
import { destroySession } from "@/lib/auth/login";
import { rejectForeignOrigin, seeOther, SESSION_COOKIE } from "@/lib/auth/request";

export async function POST(request: Request) {
  const rejected = rejectForeignOrigin(request);
  if (rejected) return rejected;

  const cookieStore = await cookies();
  const sessionToken = cookieStore.get(SESSION_COOKIE)?.value;
  if (sessionToken) await destroySession(sessionToken);
  cookieStore.delete(SESSION_COOKIE);
  return seeOther("/login");
}
