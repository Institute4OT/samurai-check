// lib/mail.ts

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

type SendMailParams = {
  to: string;
  subject: string;
  html: string;
  text?: string; // ✅ 追加！
};

export async function sendMail({ to, subject, html, text }: SendMailParams) {
  await resend.emails.send({
    from: '武将タイプ診断 <report@ourdx-mtg.com>',
    to,
    subject,
    html,
    text, // ✅ 追加！
  });
}
