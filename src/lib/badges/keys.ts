import type { JsonWebKey } from "node:crypto";
import { db } from "../db";
import { generateSigningKeyPair } from "./credential";

export type SigningKeyPair = { id: string; publicJwk: JsonWebKey; privateJwk: JsonWebKey };

/** Das Schlüsselpaar des Mandanten; beim ersten Badge wird es angelegt. */
export async function getOrCreateSigningKey(organizationId: string): Promise<SigningKeyPair> {
  const existing = await db().signingKey.findUnique({ where: { organizationId } });
  if (existing) return existing as unknown as SigningKeyPair;
  const pair = generateSigningKeyPair();
  try {
    const created = await db().signingKey.create({
      data: {
        organizationId,
        publicJwk: pair.publicJwk as object,
        privateJwk: pair.privateJwk as object,
      },
    });
    return created as unknown as SigningKeyPair;
  } catch (error) {
    // Zwei Anfragen gleichzeitig: Die andere war schneller, ihr Schlüssel gilt.
    if ((error as { code?: string }).code !== "P2002") throw error;
    const winner = await db().signingKey.findUniqueOrThrow({ where: { organizationId } });
    return winner as unknown as SigningKeyPair;
  }
}

/** Der öffentliche Schlüssel zu einer Kennung, nur beim passenden Mandanten. */
export async function findPublicKey(organizationId: string, id: string) {
  if (!/^[0-9a-f-]{36}$/.test(id)) return null;
  const key = await db().signingKey.findFirst({
    where: { id, organizationId },
    select: { id: true, publicJwk: true },
  });
  return key as { id: string; publicJwk: JsonWebKey } | null;
}
