// lib/mail.ts
import nodemailer from "nodemailer";

const host = process.env.SMTP_HOST!;
const port = Number(process.env.SMTP_PORT || 465);
const user = process.env.SMTP_USER!;
const pass = process.env.SMTP_PASS!;
const DEFAULT_FROM =
  process.env.MAIL_FROM?.trim() || `"IOT（企業の未来づくり研究所）" <info@ourdx-mtg.com>`;
const DEFAULT_REPLY_TO =
  process.env.MAIL_REPLY_TO?.trim() || "info@ourdx-mtg.com";

if (!host || !user || !pass) {
  // 早期にenv不足を発見
  throw new Error("SMTP env missing: require SMTP_HOST/SMTP_USER/SMTP_PASS");
}

export const mailer = nodemailer.createTransport({
  host,
  port,
  secure: port === 465, // 465ならtrue
  auth: { user, pass },
  tls: { minVersion: "TLSv1.2" },
  // 開発時だけ詳細ログ
  logger: process.env.NODE_ENV !== "production",
  debug: process.env.NODE_ENV !== "production",
});

type SendMailArgs = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  from?: string;     // ← API側から上書き可
  replyTo?: string;  // ← API側から上書き可
};

export async function sendMail(opts: SendMailArgs) {
  // 接続性チェック（失敗時どこで落ちたかが即わかる）
  try {
    await mailer.verify();
  } catch (e: any) {
    throw new Error(`SMTP_VERIFY_FAILED: ${e?.message || String(e)}`);
  }

  try {
    const info = await mailer.sendMail({
      to: opts.to,
      from: opts.from || DEFAULT_FROM,
      replyTo: opts.replyTo || DEFAULT_REPLY_TO || DEFAULT_FROM,
      subject: opts.subject,
      html: opts.html,
      text: opts.text || "",
    });
    // API側でダイアグを見やすくするため最低限返す
    return {
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
      envelope: info.envelope,
      // 何かあれば info.response 等も見る
    };
  } catch (e: any) {
    throw new Error(`SMTP_SEND_FAILED: ${e?.message || String(e)}`);
  }
}
