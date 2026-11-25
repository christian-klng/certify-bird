import { createInvitationLink, discardLoginToken, INVITATION_DAYS } from "../auth/login";
import { db } from "../db";
import { sendMail } from "../mail";

/**
 * Benachrichtigt alle Personen einer Ausstellung, die noch keine Mail bekommen
 * haben. Jede Mail enthält einen persönlichen Anmeldelink. Null, wenn es die
 * Ausstellung nicht gibt.
 */
export async function notifyIssuance(
  organizationId: string,
  issuanceId: string,
  origin: string,
): Promise<{ sent: number; failed: number } | null> {
  const issuance = await db().issuance.findFirst({
    where: { id: issuanceId, organizationId },
    include: { certificates: { where: { notifiedAt: null } } },
  });
  if (!issuance) return null;

  let sent = 0;
  let failed = 0;
  // Nacheinander: Mailserver begrenzen meist, wie viele Mails gleichzeitig gehen.
  for (const certificate of issuance.certificates) {
    const link = await createInvitationLink({
      email: certificate.recipientEmail,
      organizationId,
      origin,
    });
    try {
      await sendMail({
        to: certificate.recipientEmail,
        subject: `Dein Zertifikat: ${issuance.courseTitle}`,
        text: [
          `Hallo ${certificate.recipientName},`,
          ``,
          `${issuance.issuerName} hat dir ein Zertifikat für „${issuance.courseTitle}“ ausgestellt.`,
          `Mit diesem Link meldest du dich ohne Passwort an und kannst es ansehen und herunterladen:`,
          ``,
          link.url,
          ``,
          `Dort entscheidest du auch, ob dein Zertifikat eine öffentliche Seite bekommt,`,
          `die du zum Beispiel auf LinkedIn teilen kannst. Ohne deine Einwilligung sieht es niemand.`,
          ``,
          `Der Link gilt ${INVITATION_DAYS} Tage und nur einmal. Danach bekommst du unter`,
          `${origin}/login jederzeit einen neuen.`,
        ].join("\n"),
      });
      await db().certificate.update({
        where: { id: certificate.id },
        data: { notifiedAt: new Date() },
      });
      sent += 1;
    } catch (error) {
      await discardLoginToken(link.tokenHash);
      console.error(`Benachrichtigung zu Zertifikat ${certificate.id} fehlgeschlagen:`, error);
      failed += 1;
    }
  }
  return { sent, failed };
}
