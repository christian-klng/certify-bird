import { createInvitationLink, discardLoginToken, INVITATION_DAYS } from "../auth/login";
import { db } from "../db";
import { sendMail } from "../mail";

/**
 * Benachrichtigt alle Personen einer Kohorte, die noch keine Mail bekommen
 * haben: über ihr Zertifikat oder, wenn sie erst ein Quiz bestehen müssen,
 * mit der Einladung dazu. Wer in einer Kohorte ohne Quiz nur eingetragen ist,
 * bekommt nichts. Jede Mail enthält einen persönlichen Anmeldelink.
 * Null, wenn es die Kohorte nicht gibt.
 */
export async function notifyIssuance(
  organizationId: string,
  issuanceId: string,
  origin: string,
): Promise<{ sent: number; failed: number } | null> {
  const issuance = await db().issuance.findFirst({
    where: { id: issuanceId, organizationId },
    include: {
      certificates: { where: { notifiedAt: null } },
      candidates: { where: { notifiedAt: null } },
    },
  });
  if (!issuance) return null;

  const closing = [
    ``,
    `Der Link gilt ${INVITATION_DAYS} Tage und nur einmal. Danach bekommst du unter`,
    `${origin}/login jederzeit einen neuen.`,
  ];
  const mails = [
    ...issuance.certificates.map((certificate) => ({
      to: certificate.recipientEmail,
      subject: `Dein Zertifikat: ${issuance.courseTitle}`,
      text: (url: string) => [
        `Hallo ${certificate.recipientName},`,
        ``,
        `${issuance.issuerName} hat dir ein Zertifikat für „${issuance.courseTitle}“ ausgestellt.`,
        `Mit diesem Link meldest du dich ohne Passwort an und kannst es ansehen und herunterladen:`,
        ``,
        url,
        ``,
        `Dort entscheidest du auch, ob dein Zertifikat eine öffentliche Seite bekommt,`,
        `die du zum Beispiel auf LinkedIn teilen kannst. Ohne deine Einwilligung sieht es niemand.`,
        ...closing,
      ],
      markNotified: () =>
        db().certificate.update({ where: { id: certificate.id }, data: { notifiedAt: new Date() } }),
      label: `Zertifikat ${certificate.id}`,
    })),
    ...(issuance.quiz === null ? [] : issuance.candidates).map((candidate) => ({
      to: candidate.email,
      subject: `Dein Quiz: ${issuance.courseTitle}`,
      text: (url: string) => [
        `Hallo ${candidate.name},`,
        ``,
        `${issuance.issuerName} lädt dich zum Quiz für „${issuance.courseTitle}“ ein.`,
        `Wenn du es bestehst, bekommst du dein Zertifikat.`,
        `Mit diesem Link meldest du dich ohne Passwort an und kannst das Quiz beantworten:`,
        ``,
        url,
        ...closing,
      ],
      markNotified: () =>
        db().quizCandidate.update({ where: { id: candidate.id }, data: { notifiedAt: new Date() } }),
      label: `Quiz-Eintrag ${candidate.id}`,
    })),
  ];

  let sent = 0;
  let failed = 0;
  // Nacheinander: Mailserver begrenzen meist, wie viele Mails gleichzeitig gehen.
  for (const mail of mails) {
    const link = await createInvitationLink({ email: mail.to, organizationId, origin });
    try {
      await sendMail({ to: mail.to, subject: mail.subject, text: mail.text(link.url).join("\n") });
      await mail.markNotified();
      sent += 1;
    } catch (error) {
      await discardLoginToken(link.tokenHash);
      console.error(`Benachrichtigung zu ${mail.label} fehlgeschlagen:`, error);
      failed += 1;
    }
  }
  return { sent, failed };
}
