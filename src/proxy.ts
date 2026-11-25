import { NextResponse, type NextRequest } from "next/server";
import { isPublishedCertificate } from "@/lib/certificates/public";
import { readConfig } from "@/lib/config";
import { resolveTenant } from "@/lib/tenant";
import { tenantLookup } from "@/lib/tenant-lookup";

// Muss zu SESSION_COOKIE in src/lib/auth/request.ts passen. Hier nicht
// importiert, weil jene Datei Funktionen nutzt, die im Proxy nicht verfügbar sind.
const SESSION_COOKIE = "cb_session";

function notFound(): NextResponse {
  return new NextResponse("Unter dieser Adresse gibt es nichts.", {
    status: 404,
    headers: { "content-type": "text/plain; charset=utf-8" },
  });
}

/**
 * Läuft vor jeder Seite und entscheidet anhand des Hostnamens:
 * - unbekannter Host: 404
 * - Mandant über eine Nebenadresse erreicht (altes Kürzel, oder Kürzel trotz
 *   eigener Domain): Umleitung auf seine Hauptadresse, Pfad bleibt erhalten
 * - /register gibt es nur auf der Plattform-Adresse
 * - /admin und /meine-zertifikate ohne Sitzungs-Cookie: Umleitung zur Anmeldung
 * - /z/<id> ohne veröffentlichtes Zertifikat: 404
 *
 * Das passiert hier und nicht in den Seiten, weil Seiten ihre Antwort
 * streamen und dann keinen echten Statuscode 404 oder 307 mehr senden können.
 * Die eigentliche Rechteprüfung bleibt in den Seiten und Aktionen.
 */
export async function proxy(request: NextRequest) {
  const host = request.headers.get("host");
  const tenant = await resolveTenant(host, readConfig(), tenantLookup);
  const { pathname, search } = request.nextUrl;

  if (tenant.kind === "not-found") return notFound();

  // Adressen für Umleitungen aus der Anfrage bauen: request.nextUrl kann
  // hinter einem Reverse Proxy den internen Hostnamen enthalten.
  const protocol =
    request.headers.get("x-forwarded-proto") ??
    request.nextUrl.protocol.replace(":", "");
  const port = /:\d+$/.exec(host ?? "")?.[0] ?? "";

  if (tenant.kind === "tenant" && !tenant.isCanonical && tenant.canonicalHost) {
    return NextResponse.redirect(
      `${protocol}://${tenant.canonicalHost}${port}${pathname}${search}`,
      307,
    );
  }

  if (pathname === "/register" || pathname.startsWith("/register/")) {
    if (tenant.kind !== "platform") return notFound();
  }

  const needsLogin = ["/admin", "/meine-zertifikate"].some(
    (area) => pathname === area || pathname.startsWith(`${area}/`),
  );
  if (needsLogin) {
    if (tenant.kind !== "tenant" || !request.cookies.has(SESSION_COOKIE)) {
      return NextResponse.redirect(`${protocol}://${host}/login`, 307);
    }
  }

  // Öffentliche Zertifikatsseiten: Ohne Einwilligung gibt es sie nicht, und
  // zwar mit echtem 404, damit auch Suchmaschinen und Vorschauen nichts sehen.
  const publicCertificate = /^\/z\/([^/]+)(?:\/(?:pdf|badge))?$/.exec(pathname);
  if (pathname === "/z" || pathname.startsWith("/z/")) {
    if (tenant.kind !== "tenant" || !publicCertificate) return notFound();
    if (!(await isPublishedCertificate(tenant.organization.id, publicCertificate[1]))) {
      return notFound();
    }
  }

  return NextResponse.next();
}

export const config = {
  // Statische Dateien und die Statusabfrage hängen nicht vom Mandanten ab.
  matcher: ["/((?!_next/static|_next/image|favicon.ico|api/health).*)"],
};
