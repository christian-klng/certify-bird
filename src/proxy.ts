import { NextResponse, type NextRequest } from "next/server";
import { readConfig } from "@/lib/config";
import { resolveTenant } from "@/lib/tenant";
import { tenantLookup } from "@/lib/tenant-lookup";

/**
 * Läuft vor jeder Seite und entscheidet anhand des Hostnamens:
 * - unbekannter Host: 404
 * - Mandant über eine Nebenadresse erreicht (altes Kürzel, oder Kürzel trotz
 *   eigener Domain): Umleitung auf seine Hauptadresse, Pfad bleibt erhalten
 *
 * Das passiert hier und nicht in den Seiten, weil Seiten ihre Antwort
 * streamen und dann keinen echten Statuscode 404 oder 307 mehr senden können.
 */
export async function proxy(request: NextRequest) {
  const host = request.headers.get("host");
  const tenant = await resolveTenant(host, readConfig(), tenantLookup);

  if (tenant.kind === "not-found") {
    return new NextResponse("Unter dieser Adresse gibt es nichts.", {
      status: 404,
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  if (tenant.kind === "tenant" && !tenant.isCanonical && tenant.canonicalHost) {
    const protocol =
      request.headers.get("x-forwarded-proto") ??
      request.nextUrl.protocol.replace(":", "");
    const port = /:\d+$/.exec(host ?? "")?.[0] ?? "";
    const { pathname, search } = request.nextUrl;
    return NextResponse.redirect(
      `${protocol}://${tenant.canonicalHost}${port}${pathname}${search}`,
      307,
    );
  }

  return NextResponse.next();
}

export const config = {
  // Statische Dateien und die Statusabfrage hängen nicht vom Mandanten ab.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/health).*)"],
};
