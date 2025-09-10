// /lib/mailer.ts
// ============================================================
// Resend SDK を使ったメール送信ユーティリティ（運用強化版）
// - MAIL_FROM を .env.local で統一管理
// - Reply-To / CC / BCC / タグ（X-Entity-Ref-ID）対応
// - text 未指定時は HTML から自動生成
// - 例外メッセージを分かりやすく整形
// ============================================================

import { Resend } from 'resend';

const RESEND_API_KEY = process.env.RESEND_API_KEY!;
const MAIL_FROM = process.env.MAIL_FROM || 'IOT <no-reply@yourdomain.example>';

if (!RESEND_API_KEY) {
  console.warn('[mailer] RESEND_API_KEY is not set. Email sending will fail.');
}

// Resend クライアント（サーバー専用）
const resend = new Resend(RESEND_API_KEY);

// ===== 型 =====
export type SendMailOptions = {
  to: string | string[];            // 宛先（複数可）
  subject: string;                  // 件名
  html: string;                     // HTML 本文
  text?: string;                    // プレーンテキスト（省略可 → 自動生成）
  replyTo?: string | string[];      // ★ ここは camelCase
  cc?: string | string[];
  bcc?: string | string[];
  tagId?: string;                   // Resendダッシュボードで追跡する任意ID
};

// ===== HTML → Text 簡易変換 =====
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

/**
 * メール送信（Resend）
 * - 失敗時は Error を throw
 */
export async function sendMail(opts: SendMailOptions) {
  const { to, subject, html } = opts;
  if (!RESEND_API_KEY) throw new Error('RESEND_API_KEY is not set');
  if (!to) throw new Error('sendMail: `to` is required');
  if (!subject) throw new Error('sendMail: `subject` is required');
  if (!html) throw new Error('sendMail: `html` is required');

  const text = opts.text ?? htmlToText(html);

  // 任意のタグを X-Entity-Ref-ID に載せると Resend ダッシュボードで追いやすい
  const headers = opts.tagId ? { 'X-Entity-Ref-ID': String(opts.tagId) } : undefined;

  const { data, error } = await resend.emails.send({
    from: MAIL_FROM,
    to: opts.to,
    subject,
    html,
    text,
    // ★ 型に合わせて camelCase に修正（reply_to ではなく replyTo）
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

// 互換のため default もエクスポート
export default sendMail;
