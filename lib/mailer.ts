// /lib/mailer.ts
// ============================================================
// Resend SDK を使ったメール送信ユーティリティ（遅延初期化版）
// - MAIL_FROM / RESEND_API_KEY は .env から取得
// - Reply-To / CC / BCC / タグ対応
// - text 未指定時は HTML から自動生成
// ============================================================

import { Resend } from 'resend';

export type SendMailOptions = {
  to: string | string[];
  subject: string;
  html: string;
  text?: string;
  replyTo?: string | string[];
  cc?: string | string[];
  bcc?: string | string[];
  tagId?: string; // Resend の X-Entity-Ref-ID に載せて追跡
};

const MAIL_FROM =
  process.env.MAIL_FROM || 'IOT（企業の未来づくり研究所） <noreply@ourdx-mtg.com>';

// ---- HTML → text 簡易変換 ---------------------------------
function htmlToText(html: string) {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<li>/gi, '・')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

// ---- Resend クライアント（遅延初期化） ---------------------
let _resend: Resend | null = null;

function getResend(): Resend {
  if (_resend) return _resend;
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    // ここで throw しても「送信を呼んだ時」にだけ落ちる（ビルド時には落ちない）
    throw new Error(
      '[mailer] RESEND_API_KEY is not set. Set it in Vercel → Settings → Environment Variables.'
    );
  }
  _resend = new Resend(key);
  return _resend!;
}

/**
 * メール送信（Resend）
 * - 失敗時は Error を throw
 */
export async function sendMail(opts: SendMailOptions) {
  const { to, subject, html } = opts;
  if (!to) throw new Error('sendMail: `to` is required');
  if (!subject) throw new Error('sendMail: `subject` is required');
  if (!html) throw new Error('sendMail: `html` is required');

  const text = opts.text ?? htmlToText(html);
  const headers = opts.tagId ? { 'X-Entity-Ref-ID': String(opts.tagId) } : undefined;

  const resend = getResend();
  const { data, error } = await resend.emails.send({
    from: MAIL_FROM,
    to: opts.to,
    subject,
    html,
    text,
    replyTo: opts.replyTo,
    cc: opts.cc,
    bcc: opts.bcc,
    headers,
  });

  if (error) {
    const msg =
      typeof error === 'string'
        ? error
        : (error as any)?.message || JSON.stringify(error);
    throw new Error(`Resend send error: ${msg}`);
  }

  return data; // { id: string, ... }
}

export default sendMail;
