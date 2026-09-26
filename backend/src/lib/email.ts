import { env } from '../config/env';

export interface EmailMessage {
  to: string;
  subject: string;
  text: string;
  html: string;
}

const RESEND_URL = 'https://api.resend.com/emails';

/**
 * Sends one email through Resend's HTTP API. Without RESEND_API_KEY it logs
 * the whole message instead, so a Password reset link can be followed
 * locally — env.ts requires the key in production, where logging a live
 * token would be a leak. Throws when Resend rejects the message.
 */
export async function sendEmail(message: EmailMessage): Promise<void> {
  if (!env.RESEND_API_KEY) {
    console.log(
      `[email] RESEND_API_KEY is not set — not sending.\nTo: ${message.to}\nSubject: ${message.subject}\n\n${message.text}`,
    );
    return;
  }

  const res = await fetch(RESEND_URL, {
    method: 'POST',
    headers: { authorization: `Bearer ${env.RESEND_API_KEY}`, 'content-type': 'application/json' },
    body: JSON.stringify({
      from: env.EMAIL_FROM,
      to: [message.to],
      subject: message.subject,
      text: message.text,
      html: message.html,
    }),
    signal: AbortSignal.timeout(10_000),
  });
  if (!res.ok) throw new Error(`Resend rejected the email: ${res.status}`);
}

const escapeHtml = (value: string) =>
  value.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');

const RESET_COPY = {
  subject: 'ОРТО — нууц үг сэргээх',
  greeting: (name: string) => `Сайн байна уу, ${name},`,
  body: [
    'Нууц үгээ шинэчлэхийн тулд доорх товчийг дарна уу.',
    'Энэ холбоос 30 минут л хүчинтэй байх болно.',
    'Хэрэв та энэ хүсэлтийг илгээгээгүй бол уг имэйлийг хэрэгсэхгүй орхино уу.',
  ],
  button: 'Нууц үг сэргээх',
};

/** The Password reset email: approved copy, a button linking to `link`. */
export function passwordResetEmail({ to, name, link }: { to: string; name: string; link: string }): EmailMessage {
  const [instruction, ...rest] = RESET_COPY.body;
  const text = [RESET_COPY.greeting(name), instruction, `${RESET_COPY.button}: ${link}`, ...rest].join('\n\n');
  const html = [
    `<p>${escapeHtml(RESET_COPY.greeting(name))}</p>`,
    `<p>${instruction}</p>`,
    `<p><a href="${escapeHtml(link)}" style="display:inline-block;padding:14px 24px;border-radius:12px;background:#17181b;color:#ffffff;font-weight:bold;text-decoration:none">${RESET_COPY.button}</a></p>`,
    ...rest.map((line) => `<p>${line}</p>`),
  ].join('\n');

  return { to, subject: RESET_COPY.subject, text, html };
}
