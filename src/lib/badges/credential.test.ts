import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import {
  buildCredential,
  generateSigningKeyPair,
  hashIdentity,
  issuerProfile,
  signCredential,
  verifyCredential,
  type BadgeInput,
} from "./credential";

const input: BadgeInput = {
  origin: "https://zertifikate.akademie.de",
  certificateId: "e92d433b-5d7c-45d6-b752-638df1490c75",
  issuanceId: "e7ce5f95-53d6-483c-8dc4-b7e64937522d",
  issuerName: "Akademie Müller",
  courseTitle: "Grundkurs Moderation",
  description: "",
  issuedOn: new Date("2026-03-12T00:00:00Z"),
  recipientName: "Zoë Ångström",
  recipientEmail: "zoe@beispiel.de",
};

describe("buildCredential", () => {
  const credential = buildCredential(input);

  it("hat die Pflichtangaben von Open Badges 3.0", () => {
    expect(credential["@context"]).toEqual([
      "https://www.w3.org/ns/credentials/v2",
      "https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json",
    ]);
    expect(credential.type).toEqual(["VerifiableCredential", "OpenBadgeCredential"]);
    expect(credential.id).toBe(`urn:uuid:${input.certificateId}`);
    expect(credential.validFrom).toBe("2026-03-12T00:00:00Z");
    expect(credential.issuer.id).toBe("https://zertifikate.akademie.de/badges/issuer");
    const { achievement } = credential.credentialSubject;
    expect(achievement.name).toBe("Grundkurs Moderation");
    expect(achievement.description).not.toBe("");
    expect(achievement.criteria.narrative).toContain("Akademie Müller");
  });

  it("nennt die E-Mail-Adresse nur als gesalzenen Hash", () => {
    expect(JSON.stringify(credential)).not.toContain("zoe@beispiel.de");
    const [email] = credential.credentialSubject.identifier;
    const expected = createHash("sha256").update(`zoe@beispiel.de${email.salt}`).digest("hex");
    expect(email.identityHash).toBe(`sha256$${expected}`);
  });

  it("hasht wie das Beispiel der Spezifikation", () => {
    expect(hashIdentity("a@example.com", "Kosher")).toBe(
      "sha256$b5809d8a92f8858436d7e6b87c12ebc0ae1eac4baecc2c0b913aee2c922ef399",
    );
  });

  it("verwendet im Profil dieselbe Aussteller-Adresse", () => {
    expect(issuerProfile(input.origin, "Akademie Müller").id).toBe(credential.issuer.id);
  });
});

describe("Signatur", () => {
  const keys = generateSigningKeyPair();
  const credential = buildCredential(input);
  const kid = "https://zertifikate.akademie.de/badges/keys/1";
  const jws = signCredential(credential, keys.privateJwk, kid);

  it("lässt sich mit dem öffentlichen Schlüssel prüfen", () => {
    const verified = verifyCredential(jws, keys.publicJwk);
    expect(verified?.header).toEqual({ alg: "RS256", kid, typ: "JWT" });
    expect(verified?.payload).toMatchObject({
      iss: credential.issuer.id,
      jti: credential.id,
      sub: credential.credentialSubject.id,
      nbf: 1773273600,
      name: "Grundkurs Moderation",
    });
  });

  it("fällt bei verändertem Inhalt und fremdem Schlüssel durch", () => {
    const [header, payload, signature] = jws.split(".");
    const forged = Buffer.from(
      Buffer.from(payload, "base64url").toString().replace("Zoë", "Zoe"),
    ).toString("base64url");
    expect(verifyCredential(`${header}.${forged}.${signature}`, keys.publicJwk)).toBeNull();
    expect(verifyCredential(jws, generateSigningKeyPair().publicJwk)).toBeNull();
  });

  it("gibt im öffentlichen Schlüssel nichts Geheimes preis", () => {
    expect(keys.publicJwk).not.toHaveProperty("d");
    expect(keys.publicJwk.kty).toBe("RSA");
  });
});
