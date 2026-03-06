import { Resend } from 'resend';

export function isEmailEnabled() {
  return Boolean(process.env.RESEND_API_KEY) && process.env.ENABLE_EMAIL_NOTIFICATIONS !== 'false';
}

function getClient() {
  if (!isEmailEnabled()) return null;
  return new Resend(process.env.RESEND_API_KEY);
}

export async function sendEmail({ to, subject, html }) {
  const client = getClient();
  if (!client) return false;

  await client.emails.send({
    from: process.env.EMAIL_FROM || 'Koncept <portal@koncept.pl>',
    to,
    subject,
    html
  });

  return true;
}

export async function sendInviteEmail({ email, name, inviteUrl, roleLabel, projectName }) {
  const greeting = name ? `Cześć ${name},` : 'Cześć,';
  return sendEmail({
    to: email,
    subject: 'Zaproszenie do portalu klienta Koncept',
    html: `
      <p>${greeting}</p>
      <p>Otrzymujesz dostęp do portalu klienta Koncept jako <strong>${roleLabel}</strong>.</p>
      ${projectName ? `<p>Projekt: <strong>${projectName}</strong></p>` : ''}
      <p><a href="${inviteUrl}">Aktywuj konto</a></p>
      <p>Link jest ważny przez 72 godziny.</p>
    `
  });
}

export async function sendNotificationEmail({ to, subject, title, body, link }) {
  return sendEmail({
    to,
    subject,
    html: `
      <h2>${title}</h2>
      <p>${body}</p>
      ${link ? `<p><a href="${link}">Otwórz portal</a></p>` : ''}
    `
  });
}
