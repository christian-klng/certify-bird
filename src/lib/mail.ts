import nodemailer from "nodemailer";

export type Mail = { to: string; subject: string; text: string };

/**
 * Verschickt eine E-Mail über SMTP (SMTP_HOST, SMTP_PORT, SMTP_USER,
 * SMTP_PASSWORD, SMTP_FROM). Ohne SMTP_HOST wird die Mail in der Entwicklung
 * nur ins Protokoll geschrieben; im Produktivbetrieb ist das ein Fehler.
 */
export async function sendMail(mail: Mail): Promise<void> {
  const host = process.env.SMTP_HOST?.trim();
  if (!host) {
    if (process.env.NODE_ENV === "production") {
      throw new Error("SMTP_HOST ist nicht gesetzt, es kann keine E-Mail verschickt werden.");
    }
    console.log(`\n--- E-Mail (nicht verschickt, SMTP_HOST fehlt) ---\nAn: ${mail.to}\nBetreff: ${mail.subject}\n\n${mail.text}\n---\n`);
    return;
  }

  const port = Number(process.env.SMTP_PORT || 587);
  const user = process.env.SMTP_USER?.trim();
  const from = process.env.SMTP_FROM?.trim() || user;
  if (!from) {
    throw new Error("SMTP_FROM (oder SMTP_USER) muss als Absenderadresse gesetzt sein.");
  }

  const transport = nodemailer.createTransport({
    host,
    port,
    // Port 465 spricht von Beginn an TLS, 587 wechselt per STARTTLS.
    secure: port === 465,
    auth: user ? { user, pass: process.env.SMTP_PASSWORD ?? "" } : undefined,
  });
  await transport.sendMail({ from, to: mail.to, subject: mail.subject, text: mail.text });
}
