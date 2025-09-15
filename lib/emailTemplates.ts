// /lib/emailTemplates.ts
// ============================================================
// 相談申込まわりのメールテンプレート（ユーザー/運用）
// ・宛名に必ず「様」を付ける（withSama）
// ・件名に【武将タイプ診断アプリ】＋▶/■ で視認性UP
// ・IOTフッター（社名・住所・連絡先）を明記
// ・consultLink が無い場合も /consult にフォールバック
// ・テキスト版も同梱
// ・report 系は emailTemplatesV2.ts を利用（re-export 同梱）
// ============================================================

export type MailRender = { subject: string; html: string; text: string };

type ConsultArgs = {
  toEmail: string;
  toName?: string | null;
  company?: string | null;
  note?: string | null;
  rid?: string | null;
  consultLink?: string | null;
  assignee?: "ishijima" | "morigami" | string | null;
};

const APP_BASE = (
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXT_PUBLIC_BASE_URL ||
  "http://localhost:3000"
).replace(/\/$/, "");

const IOT_MAIL = process.env.MAIL_REPLY_TO || "info@ourdx-mtg.com";
const IOT_ADDR =
  "〒150-0001 東京都渋谷区神宮前2-9-4 原宿YNビル6F";
const IOT_NAME_JA =
  "一般社団法人 企業の未来づくり研究所（Institute for Our Transformation）";

function withSama(name?: string | null) {
  const n = String(name ?? "").trim();
  if (!n) return "ご担当者様";
  return n.endsWith("様") ? n : `${n} 様`;
}

function esc(s: string) {
  return String(s ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function ensureConsultLink(link?: string | null, rid?: string | null, email?: string | null) {
  let url = String(link || `${APP_BASE}/consult`);
  try {
    const u = new URL(url);
    if (rid && !u.searchParams.get("rid")) u.searchParams.set("rid", rid);
    if (email && !u.searchParams.get("email")) u.searchParams.set("email", email);
    if (!u.searchParams.get("utm_source")) u.searchParams.set("utm_source", "email");
    if (!u.searchParams.get("utm_medium")) u.searchParams.set("utm_medium", "transactional");
    if (!u.searchParams.get("utm_campaign")) u.searchParams.set("utm_campaign", "consult_intake");
    if (!u.searchParams.get("utm_content")) u.searchParams.set("utm_content", "cta_consult");
    url = u.toString();
  } catch {}
  return url;
}

function footerHtml() {
  return `
    <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
    <div style="font-size:12px;color:#555;line-height:1.6">
      <div>${IOT_NAME_JA}</div>
      <div>📧 <a href="mailto:${IOT_MAIL}">${IOT_MAIL}</a></div>
      <div>${IOT_ADDR}</div>
      <div style="margin-top:6px;">このメールにそのまま返信していただいてもOKです。</div>
    </div>
  `.trim();
}

/* ============================================================
 * 1) ユーザー宛：相談申込 受付メール
 * ============================================================ */
export function renderConsultIntakeMailToUser(args: ConsultArgs): MailRender {
  const toName = withSama(args.toName);
  const rid = args.rid || "";
  const consultUrl = ensureConsultLink(args.consultLink, args.rid || undefined, args.toEmail);

  const subject =
    `【武将タイプ診断アプリ】▶ 無料個別相談のお申し込みを受け付けました` +
    (rid ? `（ID: ${rid}）` : "");

  const pre =
    "無料個別相談のお申し込みありがとうございます。担当より日程のご案内を差し上げます。";

  const html = `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,'Apple Color Emoji','Segoe UI Emoji';line-height:1.7;color:#111">
    <div style="display:none;max-height:0;overflow:hidden;color:transparent;opacity:0;visibility:hidden">${esc(pre)}</div>

    <p>${esc(toName)}、このたびは<strong>無料個別相談</strong>のお申し込みありがとうございます。</p>
    <p>担当より日程のご案内を差し上げます。お急ぎの方は、下記の「▶ 予約ページを開く」からご希望の枠をご選択ください。</p>

    <div style="margin:18px 0;">
      <a href="${consultUrl}" style="display:inline-block;padding:12px 16px;background:#111;color:#fff;text-decoration:none;border-radius:8px;">
        ▶ 予約ページを開く
      </a>
    </div>

    <div style="margin-top:16px;font-size:14px;color:#333">
      ${args.company ? `<div>■ 会社名：${esc(args.company)}</div>` : ""}
      ${args.note ? `<div>■ ご相談内容：${esc(args.note)}</div>` : ""}
      ${rid ? `<div>■ 申込ID：${esc(rid)}</div>` : ""}
    </div>

    ${footerHtml()}
  </div>
  `.trim();

  const text =
    `${subject}\n\n` +
    `▼予約ページ: ${consultUrl}\n` +
    (args.company ? `■会社名: ${args.company}\n` : "") +
    (args.note ? `■ご相談内容: ${args.note}\n` : "") +
    (rid ? `■申込ID: ${rid}\n` : "") +
    `\n${IOT_NAME_JA}\n` +
    `📧 ${IOT_MAIL}\n` +
    `${IOT_ADDR}\n`;

  return { subject, html, text };
}

/* ============================================================
 * 2) 運用（IOT）宛：相談申込 通知メール
 * ============================================================ */
export function renderConsultIntakeMailToOps(args: ConsultArgs): MailRender {
  const rid = args.rid || "";
  const toName = withSama(args.toName);
  const consultUrl = ensureConsultLink(args.consultLink, args.rid || undefined, args.toEmail);
  const who =
    args.assignee === "morigami"
      ? "担当候補：森上"
      : args.assignee === "ishijima"
      ? "担当候補：石島"
      : "担当候補：未判定";

  const subject =
    `【武将タイプ診断アプリ／相談受付】` +
    `${args.toEmail ? ` ${args.toEmail}` : ""}` +
    `${args.company ? `／${args.company}` : ""}` +
    (rid ? `（ID: ${rid}）` : "");

  const html = `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,'Apple Color Emoji','Segoe UI Emoji';line-height:1.7;color:#111">
    <p>無料個別相談の申込を受信しました。</p>

    <div style="margin-top:12px;font-size:14px;color:#333">
      <div>■ 氏名：${esc(toName)}</div>
      ${args.company ? `<div>■ 会社名：${esc(args.company)}</div>` : ""}
      ${args.toEmail ? `<div>■ メール：${esc(args.toEmail)}</div>` : ""}
      ${rid ? `<div>■ 申込ID：${esc(rid)}</div>` : ""}
      ${args.assignee ? `<div>■ ${esc(who)}</div>` : ""}
      ${args.note ? `<div style="margin-top:8px">■ ご相談内容：<br/>${esc(args.note)}</div>` : ""}
    </div>

    <p style="margin:14px 0 0;">
      <a href="${consultUrl}" style="display:inline-block;padding:10px 14px;border:1px solid #111;border-radius:8px;text-decoration:none">
        ▶ 予約ページ（Spir等）を開く
      </a>
    </p>
  </div>
  `.trim();

  const text =
    `${subject}\n\n` +
    (args.toName ? `■氏名: ${toName}\n` : "") +
    (args.company ? `■会社名: ${args.company}\n` : "") +
    (args.toEmail ? `■メール: ${args.toEmail}\n` : "") +
    (rid ? `■申込ID: ${rid}\n` : "") +
    (args.assignee ? `■${who}\n` : "") +
    (args.note ? `■ご相談内容:\n${args.note}\n` : "") +
    `\n▼予約ページ: ${consultUrl}\n`;

  return { subject, html, text };
}

/* ============================================================
 * 3) ガイドメール（ユーザーへ：予約導線メイン）
 * ============================================================ */
export function buildConsultEmail(args: ConsultArgs): { user: MailRender } {
  const toName = withSama(args.toName);
  const rid = args.rid || "";
  const consultUrl = ensureConsultLink(args.consultLink, args.rid || undefined, args.toEmail);

  const assigneeNote =
    args.assignee === "morigami"
      ? "（担当：森上）"
      : args.assignee === "ishijima"
      ? "（担当：石島）"
      : "";

  const subject =
    `【武将タイプ診断アプリ】▶ 無料個別相談のご案内${assigneeNote}` +
    (rid ? `（ID: ${rid}）` : "");

  const html = `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,'Apple Color Emoji','Segoe UI Emoji';line-height:1.7;color:#111">
    <p>${esc(toName)}、無料個別相談のご予約は下記よりお願いします。</p>

    <div style="margin:18px 0;">
      <a href="${consultUrl}" style="display:inline-block;padding:12px 16px;background:#111;color:#fff;text-decoration:none;border-radius:8px;">
        ▶ 予約ページを開く
      </a>
    </div>

    ${footerHtml()}
  </div>
  `.trim();

  const text =
    `${subject}\n\n` +
    `▼予約ページ: ${consultUrl}\n` +
    `\n${IOT_NAME_JA}\n` +
    `📧 ${IOT_MAIL}\n` +
    `${IOT_ADDR}\n`;

  return { user: { subject, html, text } };
}

// --- report 系の re-export（★互換エイリアスつき） ---
export {
  buildReportEmailV2,                       // 新実装
  buildReportEmailV2 as buildReportEmail,   // 互換用：旧名で import されてもOKにする
  type ReportEmailV2Input,
} from "./emailTemplatesV2";
