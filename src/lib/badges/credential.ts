import {
  createHash,
  createPrivateKey,
  createPublicKey,
  generateKeyPairSync,
  sign,
  verify,
  type JsonWebKey,
} from "node:crypto";

// Open Badges 3.0: ein Verifiable Credential, signiert im JWT-Format (RS256).
// https://www.imsglobal.org/spec/ob/v3p0/

const CONTEXT = [
  "https://www.w3.org/ns/credentials/v2",
  "https://purl.imsglobal.org/spec/ob/v3p0/context-3.0.3.json",
];
const SCHEMA = {
  id: "https://purl.imsglobal.org/spec/ob/v3p0/schema/json/ob_v3p0_achievementcredential_schema.json",
  type: "1EdTechJsonSchemaValidator2019",
};

export type BadgeInput = {
  /** Basisadresse des Mandanten, z. B. https://zertifikate.meine-akademie.de */
  origin: string;
  certificateId: string;
  issuanceId: string;
  issuerName: string;
  courseTitle: string;
  description: string;
  issuedOn: Date;
  recipientName: string;
  recipientEmail: string;
};

export function issuerUrl(origin: string): string {
  return `${origin}/badges/issuer`;
}

export function keyUrl(origin: string, keyId: string): string {
  return `${origin}/badges/keys/${keyId}`;
}

/** Das Profil des Ausstellers, wie es unter seiner Adresse abrufbar ist. */
export function issuerProfile(origin: string, name: string) {
  return {
    "@context": CONTEXT,
    id: issuerUrl(origin),
    type: ["Profile"],
    name,
    url: origin,
  };
}

/** Bildet aus einer Zeichenkette eine stabile UUID-förmige Kennung. */
function derivedUuid(seed: string): string {
  const hex = createHash("sha256").update(seed).digest("hex");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20, 32)}`;
}

/**
 * Die E-Mail-Adresse steht nur als gesalzener Hash im Badge: Wer sie kennt,
 * kann prüfen, dass das Badge dieser Person gehört; herauslesen lässt sie sich nicht.
 */
export function hashIdentity(value: string, salt: string): string {
  return `sha256$${createHash("sha256").update(value + salt, "utf8").digest("hex")}`;
}

/** Der Inhalt des Badges ohne Signatur. */
export function buildCredential(input: BadgeInput) {
  const salt = input.certificateId;
  return {
    "@context": CONTEXT,
    id: `urn:uuid:${input.certificateId}`,
    type: ["VerifiableCredential", "OpenBadgeCredential"],
    issuer: {
      id: issuerUrl(input.origin),
      type: ["Profile"],
      name: input.issuerName,
      url: input.origin,
    },
    validFrom: `${input.issuedOn.toISOString().slice(0, 10)}T00:00:00Z`,
    name: input.courseTitle,
    credentialSubject: {
      // Eine Kennung ohne Aussage über die Person. Das JWT-Format verlangt sie.
      id: `urn:uuid:${derivedUuid(`subject:${input.certificateId}`)}`,
      type: ["AchievementSubject"],
      identifier: [
        {
          type: "IdentityObject",
          identityType: "emailAddress",
          hashed: true,
          identityHash: hashIdentity(input.recipientEmail, salt),
          salt,
        },
        {
          type: "IdentityObject",
          identityType: "name",
          hashed: false,
          identityHash: input.recipientName,
        },
      ],
      achievement: {
        id: `urn:uuid:${input.issuanceId}`,
        type: ["Achievement"],
        name: input.courseTitle,
        description:
          input.description || `Teilnahme an der Weiterbildung „${input.courseTitle}“.`,
        criteria: {
          narrative: `${input.issuerName} bestätigt die Teilnahme an der Weiterbildung „${input.courseTitle}“.`,
        },
      },
    },
    credentialSchema: [SCHEMA],
  };
}

export type Credential = ReturnType<typeof buildCredential>;

function base64url(value: string | Buffer): string {
  return Buffer.from(value).toString("base64url");
}

/**
 * Signiert ein Badge als kompaktes JWS. Der Kopf verweist auf die Adresse des
 * öffentlichen Schlüssels; die Nutzlast ist das Badge selbst plus die
 * JWT-Angaben, die die Spezifikation daraus ableitet.
 */
export function signCredential(credential: Credential, privateJwk: JsonWebKey, kid: string): string {
  const header = { alg: "RS256", kid, typ: "JWT" };
  const payload = {
    ...credential,
    iss: credential.issuer.id,
    jti: credential.id,
    sub: credential.credentialSubject.id,
    nbf: Math.floor(new Date(credential.validFrom).getTime() / 1000),
  };
  const signingInput = `${base64url(JSON.stringify(header))}.${base64url(JSON.stringify(payload))}`;
  const signature = sign(
    "RSA-SHA256",
    Buffer.from(signingInput),
    createPrivateKey({ key: privateJwk, format: "jwk" }),
  );
  return `${signingInput}.${base64url(signature)}`;
}

/** Prüft die Signatur eines Badges und liefert Kopf und Nutzlast; null, wenn sie nicht stimmt. */
export function verifyCredential(
  jws: string,
  publicJwk: JsonWebKey,
): { header: Record<string, unknown>; payload: Record<string, unknown> } | null {
  const parts = jws.split(".");
  if (parts.length !== 3) return null;
  const valid = verify(
    "RSA-SHA256",
    Buffer.from(`${parts[0]}.${parts[1]}`),
    createPublicKey({ key: publicJwk, format: "jwk" }),
    Buffer.from(parts[2], "base64url"),
  );
  if (!valid) return null;
  return {
    header: JSON.parse(Buffer.from(parts[0], "base64url").toString()),
    payload: JSON.parse(Buffer.from(parts[1], "base64url").toString()),
  };
}

/** Erzeugt ein RSA-Schlüsselpaar (2048 Bit) für RS256. */
export function generateSigningKeyPair(): { publicJwk: JsonWebKey; privateJwk: JsonWebKey } {
  const { publicKey, privateKey } = generateKeyPairSync("rsa", { modulusLength: 2048 });
  return {
    publicJwk: publicKey.export({ format: "jwk" }),
    privateJwk: privateKey.export({ format: "jwk" }),
  };
}
