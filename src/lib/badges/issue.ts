import { buildCredential, keyUrl, signCredential } from "./credential";
import { getOrCreateSigningKey } from "./keys";

/** Erzeugt das signierte Open Badge zu einem Zertifikat samt seiner Ausstellung. */
export async function signedBadge(
  origin: string,
  certificate: {
    id: string;
    organizationId: string;
    recipientName: string;
    recipientEmail: string;
    issuance: {
      id: string;
      issuerName: string;
      courseTitle: string;
      description: string;
      issuedOn: Date;
    };
  },
): Promise<string> {
  const key = await getOrCreateSigningKey(certificate.organizationId);
  const credential = buildCredential({
    origin,
    certificateId: certificate.id,
    issuanceId: certificate.issuance.id,
    issuerName: certificate.issuance.issuerName,
    courseTitle: certificate.issuance.courseTitle,
    description: certificate.issuance.description,
    issuedOn: certificate.issuance.issuedOn,
    recipientName: certificate.recipientName,
    recipientEmail: certificate.recipientEmail,
  });
  return signCredential(credential, key.privateJwk, keyUrl(origin, key.id));
}

/** Antwort mit einem signierten Badge. Die Spezifikation sieht dafür text/plain vor. */
export function badgeResponse(jws: string, filename: string): Response {
  const ascii = filename.replace(/[^A-Za-z0-9._ -]/g, "_");
  return new Response(jws, {
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Content-Disposition": `attachment; filename="${ascii}"; filename*=UTF-8''${encodeURIComponent(filename)}`,
      "Cache-Control": "no-store",
    },
  });
}
