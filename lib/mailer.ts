// /lib/mailer.ts
// ============================================================
// Resend SDK を使ったメール送信ユーティリティ（遅延初期化・堅牢化）
// - MAIL_FROM / RESEND_API_KEY は .env から取得（実行時に読む）
// - Reply-To / CC / BCC / タグ対応
// - text 未指定時は HTML から自動生成
// - MAIL_FROM のフォーマットを正規化＆検証
// ============================================================

import { Resend } from "resend";

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

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

// ---- HTML → text 簡易変換 ---------------------------------
function htmlToText(html: string) {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<li[^>]*>/gi, "・")
    .replace(/<\/li>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

// ---- MAIL_FROM 正規化 --------------------------------------
function normalizeFrom(rawFrom: string | undefined): string {
  const v = String(rawFrom ?? "").trim();

  if (!v) {
    // 何も指定が無ければ Verified ドメインの no-reply を既定に
    return "noreply@ourdx-mtg.com";
  }

  // 末尾や先頭の余分な " を除去（.env の入力ミス吸収）
  let s = v.replace(/^\s*"+|"+\s*$/g, "");

  // "Name" <mail> 形式の末尾だけに " が残る誤入力をさらに吸収
  s = s.replace(/>\s*"+$/, ">");

  // 角括弧が含まれているなら "表示名" <mail> を再構成
  if (s.includes("<") && s.includes(">")) {
    const name = s
      .substring(0, s.indexOf("<"))
      .trim()
      .replace(/^"+|"+$/g, "");
    const email = s.substring(s.indexOf("<") + 1, s.indexOf(">")).trim();
    if (!EMAIL_RE.test(email)) {
      throw new Error(
        `[mailer] MAIL_FROM のメール部が不正です: "${email}". 例: "武将タイプ診断 <noreply@your-domain.com>"`,
      );
    }
    const disp = name ? `"${name}" <${email}>` : email;
    return disp;
  }

  // 角括弧が無い場合はプレーンメール想定
  if (EMAIL_RE.test(s)) return s;

  // "Name <mail>" のように引用はあるが < > が無い誤入力も拾って組み立て直す
  const m = s.match(/(.+)\s+([^\s@]+@[^\s@]+\.[^\s@]+)/);
  if (m) {
    const name = m[1].replace(/^"+|"+$/g, "").trim();
    const email = m[2].trim();
    if (EMAIL_RE.test(email)) return `"${name}" <${email}>`;
  }

  throw new Error(
    `[mailer] MAIL_FROM が不正です: "${v}". 例: "武将タイプ診断 <noreply@your-domain.com>" または "noreply@your-domain.com"`,
  );
}

// ---- Resend クライアント（遅延初期化） ---------------------
let _resend: Resend | null = null;
function getResend(): Resend {
  if (_resend) return _resend;
  const key = process.env.RESEND_API_KEY;
  if (!key) {
    throw new Error(
      "[mailer] RESEND_API_KEY is not set. Set it in Vercel → Settings → Environment Variables.",
    );
  }
  _resend = new Resend(key);
  return _resend;
}

/**
 * メール送信（Resend）
 * - 失敗時は Error を throw
 */
export async function sendMail(opts: SendMailOptions) {
  const { to, subject, html } = opts;
  if (!to) throw new Error("sendMail: `to` is required");
  if (!subject) throw new Error("sendMail: `subject` is required");
  if (!html) throw new Error("sendMail: `html` is required");

  const from = normalizeFrom(process.env.MAIL_FROM);
  const text = opts.text ?? htmlToText(html);
  const headers = opts.tagId
    ? { "X-Entity-Ref-ID": String(opts.tagId) }
    : undefined;

  const resend = getResend();
  const { data, error } = await resend.emails.send({
    from,
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
      typeof error === "string"
        ? error
        : (error as any)?.message || JSON.stringify(error);
    throw new Error(`Resend send error: ${msg}`);
  }
  return data; // { id: string, ... }
}

export default sendMail;
