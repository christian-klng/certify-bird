import { createHash, randomBytes } from "node:crypto";

/** Zufälliges Token für Magic Links und Sitzungen (256 Bit, URL-tauglich). */
export function generateToken(): string {
  return randomBytes(32).toString("base64url");
}

/** In der Datenbank liegt nur dieser Hash, nie das Token selbst. */
export function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/** Liefert die E-Mail-Adresse kleingeschrieben oder null, wenn sie nicht plausibel ist. */
export function normalizeEmail(input: unknown): string | null {
  if (typeof input !== "string") return null;
  const email = input.trim().toLowerCase();
  if (email.length > 254) return null;
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email) ? email : null;
}
