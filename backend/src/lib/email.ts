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
 * the whole message instead, so an emailed link (Password reset, Email
 * confirmation) can be followed locally — env.ts requires the key in
 * production, where logging a live token would be a leak. Throws when Resend rejects the message.
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

interface ButtonEmailCopy {
  subject: string;
  greeting: (name: string) => string;
  /** The first line comes before the button; the rest after it. */
  body: string[];
  button: string;
}

/** An email of approved copy around one button linking to `link`. */
function buttonEmail(copy: ButtonEmailCopy, { to, name, link }: { to: string; name: string; link: string }): EmailMessage {
  const [instruction, ...rest] = copy.body;
  const text = [copy.greeting(name), instruction, `${copy.button}: ${link}`, ...rest].join('\n\n');
  const html = [
    `<p>${escapeHtml(copy.greeting(name))}</p>`,
    `<p>${instruction}</p>`,
    `<p><a href="${escapeHtml(link)}" style="display:inline-block;padding:14px 24px;border-radius:12px;background:#17181b;color:#ffffff;font-weight:bold;text-decoration:none">${copy.button}</a></p>`,
    ...rest.map((line) => `<p>${line}</p>`),
  ].join('\n');

  return { to, subject: copy.subject, text, html };
}

/** The Password reset email: approved copy, a button linking to `link`. */
export function passwordResetEmail(recipient: { to: string; name: string; link: string }): EmailMessage {
  return buttonEmail(RESET_COPY, recipient);
}

const CONFIRMATION_COPY = {
  subject: 'ОРТО — имэйл хаягаа баталгаажуулна уу',
  greeting: RESET_COPY.greeting,
  body: [
    'ОРТО-д бүртгүүлсэнд баярлалаа. Бүртгэлээ дуусгахын тулд доорх товчийг дарж имэйл хаягаа баталгаажуулна уу.',
    'Энэ холбоос 24 цаг хүчинтэй байх болно.',
    'Хэрэв та ОРТО-д бүртгүүлээгүй бол уг имэйлийг хэрэгсэхгүй орхино уу.',
  ],
  button: 'Имэйл баталгаажуулах',
};

/** The Email confirmation email: a button linking to `link`. */
export function emailConfirmationEmail(recipient: { to: string; name: string; link: string }): EmailMessage {
  return buttonEmail(CONFIRMATION_COPY, recipient);
}
