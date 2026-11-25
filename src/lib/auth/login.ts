import { db } from "../db";
import { sendMail } from "../mail";
import { isValidSlug } from "../tenant-host";
import { generateToken, hashToken } from "./tokens";

const LOGIN_TOKEN_MINUTES = 15;
const SESSION_DAYS = 30;
/** So lange gilt der Link aus der Benachrichtigung über ein Zertifikat. */
export const INVITATION_DAYS = 14;
/** Höchstens so viele Links pro Adresse im Gültigkeitszeitraum. */
const MAX_TOKENS_PER_WINDOW = 5;

function minutesFromNow(minutes: number): Date {
  return new Date(Date.now() + minutes * 60_000);
}

async function tooManyRecentTokens(email: string): Promise<boolean> {
  const recent = await db().loginToken.count({
    where: { email, createdAt: { gt: minutesFromNow(-LOGIN_TOKEN_MINUTES) } },
  });
  return recent >= MAX_TOKENS_PER_WINDOW;
}

/** Für Protokollzeilen: genug, um eine Adresse wiederzuerkennen, ohne sie auszuschreiben. */
function maskEmail(email: string): string {
  const [local, domain] = email.split("@");
  return `${local.slice(0, 2)}***@${domain}`;
}

/**
 * Verschickt die Mail zu einem frisch angelegten Link. Schlägt der Versand
 * fehl, wird der Link wieder gelöscht: Er wäre unbrauchbar und würde sonst
 * auf das Limit pro Adresse angerechnet.
 */
async function sendTokenMail(
  tokenHash: string,
  mail: Parameters<typeof sendMail>[0],
): Promise<void> {
  try {
    await sendMail(mail);
  } catch (error) {
    await db().loginToken.deleteMany({ where: { tokenHash } });
    throw error;
  }
}

/**
 * Wer sich bei einem Mandanten anmelden darf: Mitglieder der Verwaltung und
 * Personen, für die dort ein Zertifikat ausgestellt wurde.
 */
async function loginRole(
  organizationId: string,
  email: string,
): Promise<"member" | "participant" | null> {
  const membership = await db().membership.findFirst({
    where: { organizationId, user: { email } },
    select: { id: true },
  });
  if (membership) return "member";
  const certificate = await db().certificate.findFirst({
    where: { organizationId, recipientEmail: email },
    select: { id: true },
  });
  return certificate ? "participant" : null;
}

function verifyUrl(origin: string, token: string): string {
  return `${origin}/login/verify?token=${token}`;
}

/**
 * Schickt einem Mitglied oder einer Person mit Zertifikat einen Anmeldelink.
 * Gibt bewusst nichts zurück: Ob die Adresse bekannt ist, soll von außen
 * nicht erkennbar sein.
 */
export async function requestLogin(input: {
  email: string;
  organization: { id: string; name: string };
  origin: string;
}): Promise<void> {
  const who = `${maskEmail(input.email)} bei "${input.organization.name}"`;
  if (!(await loginRole(input.organization.id, input.email))) {
    console.log(`Kein Anmeldelink: ${who} ist kein Mitglied und hat kein Zertifikat.`);
    return;
  }
  if (await tooManyRecentTokens(input.email)) {
    console.log(
      `Kein Anmeldelink: ${who} hat das Limit von ${MAX_TOKENS_PER_WINDOW} Links in ${LOGIN_TOKEN_MINUTES} Minuten erreicht.`,
    );
    return;
  }

  const token = generateToken();
  const tokenHash = hashToken(token);
  await db().loginToken.create({
    data: {
      tokenHash,
      purpose: "LOGIN",
      email: input.email,
      organizationId: input.organization.id,
      expiresAt: minutesFromNow(LOGIN_TOKEN_MINUTES),
    },
  });
  await sendTokenMail(tokenHash, {
    to: input.email,
    subject: `Anmeldung bei ${input.organization.name}`,
    text: [
      `Hallo,`,
      ``,
      `mit diesem Link meldest du dich bei ${input.organization.name} an:`,
      ``,
      verifyUrl(input.origin, token),
      ``,
      `Der Link gilt ${LOGIN_TOKEN_MINUTES} Minuten und nur einmal.`,
      `Falls du keine Anmeldung angefordert hast, kannst du diese E-Mail ignorieren.`,
    ].join("\n"),
  });
  console.log(`Anmeldelink an den Mailserver übergeben: ${who}.`);
}

/**
 * Legt für die Benachrichtigung über ein Zertifikat einen Anmeldelink an, der
 * länger gilt als ein angeforderter: Die Mail wird oft erst Tage später
 * gelesen. Gibt die Adresse des Links zurück; verschickt wird sie vom Aufrufer.
 */
export async function createInvitationLink(input: {
  email: string;
  organizationId: string;
  origin: string;
}): Promise<{ url: string; tokenHash: string }> {
  const token = generateToken();
  const tokenHash = hashToken(token);
  await db().loginToken.create({
    data: {
      tokenHash,
      purpose: "LOGIN",
      email: input.email,
      organizationId: input.organizationId,
      expiresAt: minutesFromNow(INVITATION_DAYS * 24 * 60),
    },
  });
  return { url: verifyUrl(input.origin, token), tokenHash };
}

/** Nimmt einen Einladungslink zurück, dessen Mail nicht verschickt werden konnte. */
export async function discardLoginToken(tokenHash: string): Promise<void> {
  await db().loginToken.deleteMany({ where: { tokenHash } });
}

export type RegistrationError = "name" | "slug-invalid" | "slug-taken";

async function slugIsTaken(slug: string): Promise<boolean> {
  const [organization, retired] = await Promise.all([
    db().organization.findUnique({ where: { slug }, select: { id: true } }),
    db().retiredSlug.findUnique({ where: { slug }, select: { slug: true } }),
  ]);
  return Boolean(organization || retired);
}

/**
 * Nimmt eine Registrierung entgegen und schickt den Bestätigungslink.
 * Der Mandant wird erst beim Einlösen des Links angelegt, damit niemand mit
 * fremden Adressen Kürzel blockieren kann.
 */
export async function requestRegistration(input: {
  email: string;
  orgName: string;
  slug: string;
  origin: string;
}): Promise<{ ok: true } | { ok: false; error: RegistrationError }> {
  const orgName = input.orgName.trim();
  if (orgName.length < 2 || orgName.length > 120) return { ok: false, error: "name" };
  if (!isValidSlug(input.slug)) return { ok: false, error: "slug-invalid" };
  if (await slugIsTaken(input.slug)) return { ok: false, error: "slug-taken" };
  if (await tooManyRecentTokens(input.email)) {
    console.log(
      `Kein Registrierungslink: ${maskEmail(input.email)} hat das Limit von ${MAX_TOKENS_PER_WINDOW} Links in ${LOGIN_TOKEN_MINUTES} Minuten erreicht.`,
    );
    return { ok: true };
  }

  const token = generateToken();
  const tokenHash = hashToken(token);
  await db().loginToken.create({
    data: {
      tokenHash,
      purpose: "REGISTER",
      email: input.email,
      pendingOrgName: orgName,
      pendingOrgSlug: input.slug,
      expiresAt: minutesFromNow(LOGIN_TOKEN_MINUTES),
    },
  });
  await sendTokenMail(tokenHash, {
    to: input.email,
    subject: `Registrierung von ${orgName} bestätigen`,
    text: [
      `Hallo,`,
      ``,
      `mit diesem Link schließt du die Registrierung von ${orgName} ab:`,
      ``,
      verifyUrl(input.origin, token),
      ``,
      `Der Link gilt ${LOGIN_TOKEN_MINUTES} Minuten und nur einmal.`,
      `Falls du dich nicht registriert hast, kannst du diese E-Mail ignorieren.`,
    ].join("\n"),
  });
  console.log(`Registrierungslink an den Mailserver übergeben: ${maskEmail(input.email)}.`);
  return { ok: true };
}

/** Prüft einen Link, ohne ihn zu verbrauchen (für die Bestätigungsseite). */
export async function peekLoginToken(
  token: string,
): Promise<{ purpose: "LOGIN" | "REGISTER"; organizationId: string | null } | null> {
  const found = await db().loginToken.findUnique({
    where: { tokenHash: hashToken(token) },
    select: { purpose: true, organizationId: true, usedAt: true, expiresAt: true },
  });
  if (!found || found.usedAt || found.expiresAt <= new Date()) return null;
  return { purpose: found.purpose, organizationId: found.organizationId };
}

export type ConfirmResult =
  /** Anmeldung erfolgreich: Das Sitzungstoken gehört in den Cookie. */
  | { kind: "session"; sessionToken: string; expiresAt: Date; role: "member" | "participant" }
  /** Registrierung erfolgreich: weiter zur Anmeldung beim neuen Mandanten. */
  | { kind: "registered"; slug: string; loginToken: string }
  | { kind: "invalid" }
  | { kind: "slug-taken" };

/**
 * Löst einen Link ein. `context` beschreibt, auf welcher Adresse das passiert:
 * Anmeldelinks gelten nur beim zugehörigen Mandanten, Registrierungslinks nur
 * auf der Plattform.
 */
export async function confirmLoginToken(
  token: string,
  context: { kind: "tenant"; organizationId: string } | { kind: "platform" },
): Promise<ConfirmResult> {
  const tokenHash = hashToken(token);
  const found = await db().loginToken.findUnique({ where: { tokenHash } });
  if (!found) return { kind: "invalid" };

  const matchesContext =
    found.purpose === "LOGIN"
      ? context.kind === "tenant" && context.organizationId === found.organizationId
      : context.kind === "platform";
  if (!matchesContext) return { kind: "invalid" };

  // Atomar als benutzt markieren: Von zwei gleichzeitigen Versuchen gewinnt genau einer.
  const claimed = await db().loginToken.updateMany({
    where: { tokenHash, usedAt: null, expiresAt: { gt: new Date() } },
    data: { usedAt: new Date() },
  });
  if (claimed.count !== 1) return { kind: "invalid" };

  if (found.purpose === "LOGIN") {
    // Erneut prüfen: Seit dem Verschicken kann das Zertifikat gelöscht worden sein.
    const role = await loginRole(found.organizationId!, found.email);
    if (!role) return { kind: "invalid" };
    const user = await db().user.upsert({
      where: { email: found.email },
      update: {},
      create: { email: found.email },
      select: { id: true },
    });
    return createSession(user.id, role);
  }

  const slug = found.pendingOrgSlug!;
  if (await slugIsTaken(slug)) return { kind: "slug-taken" };
  const loginToken = generateToken();
  try {
    await db().$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: { name: found.pendingOrgName!, slug },
      });
      const user = await tx.user.upsert({
        where: { email: found.email },
        update: {},
        create: { email: found.email },
      });
      await tx.membership.create({
        data: { userId: user.id, organizationId: organization.id, role: "OWNER" },
      });
      await tx.loginToken.create({
        data: {
          tokenHash: hashToken(loginToken),
          purpose: "LOGIN",
          email: found.email,
          organizationId: organization.id,
          expiresAt: minutesFromNow(LOGIN_TOKEN_MINUTES),
        },
      });
    });
  } catch (error) {
    // Jemand anderes war mit demselben Kürzel einen Augenblick schneller.
    if ((error as { code?: string }).code === "P2002") return { kind: "slug-taken" };
    throw error;
  }
  return { kind: "registered", slug, loginToken };
}

async function createSession(
  userId: string,
  role: "member" | "participant",
): Promise<ConfirmResult> {
  const sessionToken = generateToken();
  const expiresAt = minutesFromNow(SESSION_DAYS * 24 * 60);
  await db().session.create({
    data: { tokenHash: hashToken(sessionToken), userId, expiresAt },
  });
  return { kind: "session", sessionToken, expiresAt, role };
}

export async function destroySession(sessionToken: string): Promise<void> {
  await db().session.deleteMany({ where: { tokenHash: hashToken(sessionToken) } });
}

/** Liefert Person und Rolle, wenn das Sitzungstoken gültig ist und sie dem Mandanten angehört. */
export async function findMember(
  sessionToken: string,
  organizationId: string,
): Promise<{ userId: string; email: string; role: "OWNER" | "MEMBER" } | null> {
  const session = await db().session.findUnique({
    where: { tokenHash: hashToken(sessionToken) },
    select: {
      expiresAt: true,
      user: {
        select: {
          id: true,
          email: true,
          memberships: { where: { organizationId }, select: { role: true } },
        },
      },
    },
  });
  if (!session || session.expiresAt <= new Date()) return null;
  const membership = session.user.memberships[0];
  if (!membership) return null;
  return { userId: session.user.id, email: session.user.email, role: membership.role };
}

/** Liefert die angemeldete Person zu einem gültigen Sitzungstoken, unabhängig von ihrer Rolle. */
export async function findSessionUser(
  sessionToken: string,
): Promise<{ userId: string; email: string } | null> {
  const session = await db().session.findUnique({
    where: { tokenHash: hashToken(sessionToken) },
    select: { expiresAt: true, user: { select: { id: true, email: true } } },
  });
  if (!session || session.expiresAt <= new Date()) return null;
  return { userId: session.user.id, email: session.user.email };
}
