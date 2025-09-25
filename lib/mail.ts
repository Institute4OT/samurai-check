// lib/mail.ts

import { Resend } from 'resend';

const resend = new Resend(process.env.RESEND_API_KEY);

type SendMailParams = {
  to: string;
  subject: string;
  html: string;
  text?: string; // ✅ 追加！
  replyTo?: string; // ✅追加！
  tagId?: string;   // ✅追加！
};

export async function sendMail({ to, subject, html, text, replyTo, tagId}: SendMailParams) {
  await resend.emails.send({
    from: '武将タイプ診断 <report@ourdx-mtg.com>',
    to,
    subject,
    html,
    text, // ✅ 追加！
    replyTo: replyTo,  // ✅ resend API用プロパティ名
    tags: tagId ? [{ name: "tagId", value: tagId }] : undefined, // ✅ tagsの形式に変換
  });
}

export async function sendReportMail(params: SendMailParams) {
  return await sendMail(params); // 既存のsendMailを呼ぶだけでOK
}

