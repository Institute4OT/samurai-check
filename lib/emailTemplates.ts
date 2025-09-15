// /lib/emailTemplates.ts
// ============================================================
// メールテンプレート集（互換API + V2再エクスポート）
// ============================================================

export type MailRender = {
  subject: string;
  html: string;
  text: string;
};

// ------------------------------------------------------------
// 環境
// ------------------------------------------------------------
const APP_BASE = (
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXT_PUBLIC_BASE_URL ||
  "http://localhost:3000"
).replace(/\/$/, "");

export const REPORT_URL = `${APP_BASE}/report`;
const BOOKING_BASE = (
  process.env.NEXT_PUBLIC_BOOKING_URL || `${APP_BASE}/consult`
).replace(/\/$/, "");

// ------------------------------------------------------------
// ユーティリティ
// ------------------------------------------------------------
function stripTags(html: string) {
  return html.replace(/<[^>]+>/g, "");
}

function ensureSama(name?: string | null) {
  const base = (name ?? "").trim();
  if (!base) return "ご担当者様";
  return /様$/.test(base) ? base : `${base} 様`;
}

function withRidAndEmail(
  url: string,
  rid?: string,
  email?: string,
  campaign?: string,
) {
  const u = new URL(url);
  if (rid) u.searchParams.set("rid", rid);
  if (email) u.searchParams.set("email", email);
  if (campaign) {
    if (!u.searchParams.has("utm_source"))
      u.searchParams.set("utm_source", "email");
    if (!u.searchParams.has("utm_medium"))
      u.searchParams.set("utm_medium", "transactional");
    if (!u.searchParams.has("utm_campaign"))
      u.searchParams.set("utm_campaign", campaign);
  }
  return u.toString();
}

// 予約URL（Spir等のURLがなければ汎用の /consult）
function bookingUrlFor(email?: string, rid?: string, spirUrl?: string) {
  const base = (spirUrl && spirUrl.trim()) || BOOKING_BASE;
  return withRidAndEmail(base, rid, email, "consult_cta");
}

// ------------------------------------------------------------
// 相談系（ユーザー向け/社内向け）
// ------------------------------------------------------------
export type Consultant = {
  name?: string | null;
  email: string;
  company?: string | null;
  note?: string | null;
  /** 任意：担当者固有の予約URL（あれば優先） */
  spirUrl?: string | null;
  /** 任意：結果ID（rid） */
  resultId?: string | null;
};

export function renderConsultIntakeMailToUser(input: Consultant): MailRender {
  const to = ensureSama(input.name);
  const rid = input.resultId ?? undefined;
  const btnUrl = bookingUrlFor(input.email, rid, input.spirUrl ?? undefined);

  const subject = "【IOT】無料個別相談のご案内（お申し込み受付）";
  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto;line-height:1.7;color:#111">
      <p>${to}</p>
      <p>IOT（企業の未来づくり研究所）への無料個別相談のお申し込みを受け付けました。</p>
      <p>担当者からのご連絡をお待ちいただくとともに、以下のボタンからも日程をご予約いただけます。</p>
      <p style="margin:16px 0">
        <a href="${btnUrl}" style="display:inline-block;padding:12px 16px;background:#111;color:#fff;text-decoration:none;border-radius:8px">
          ▶ 無料個別相談を予約する
        </a>
      </p>
      <p style="font-size:12px;color:#555">※ 本メールにそのままご返信いただいてもOKです。</p>
      <hr style="border:none;border-top:1px solid #eee;margin:20px 0" />
      <p style="font-size:12px;color:#555">お申し込みメール：${input.email}</p>
    </div>
  `.trim();

  return {
    subject,
    html,
    text: `${subject}\n\n${stripTags(html)}\n\n${btnUrl}`,
  };
}

export function renderConsultIntakeMailToOps(input: Consultant): MailRender {
  const title = "【IOT】相談受付（社内通知）";
  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto;line-height:1.7;color:#111">
      <p>相談受付がありました。</p>
      <ul>
        <li>お名前：${input.name ?? "-"}</li>
        <li>メール：${input.email}</li>
        <li>会社：${input.company ?? "-"}</li>
        <li>メモ：${input.note ?? "-"}</li>
        <li>rid：${input.resultId ?? "-"}</li>
        <li>予約URL：${input.spirUrl ?? "-"}</li>
      </ul>
    </div>
  `.trim();
  return { subject: title, html, text: `${title}\n\n${stripTags(html)}` };
}

// ------------------------------------------------------------
// 詳細レポート（従来版：/report/<rid> への導線）
// ------------------------------------------------------------
export type ReportEmailInput = {
  id?: string; // rid
  typeName?: string; // 例: 真田幸村型
  toName?: string; // 宛名
  email?: string; // 送信先(任意) → UTM付与に使う
  reportUrl?: string; // 未指定なら REPORT_URL + /[id]
  titlePrefix?: string; // 既定: 【武将タイプ診断】
};

export function buildReportEmail(input: ReportEmailInput): MailRender {
  const rid = input.id ?? "unknown-id";
  const typeName = input.typeName ?? "（タイプ判定中）";
  const prefix = input.titlePrefix ?? "【武将タイプ診断】";
  const to = ensureSama(input.toName);

  const url = withRidAndEmail(
    input.reportUrl ?? `${REPORT_URL}/${encodeURIComponent(rid)}`,
    rid,
    input.email,
    "report_ready",
  );

  const subject = `${prefix} ▶ ${typeName} ｜ ■詳細レポートのご案内（シェア歓迎） （ID: ${rid}）`;

  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto;line-height:1.7;color:#111">
      <p>${to}、こんにちは。IOT（企業の未来づくり研究所）です。</p>
      <p>診断の詳細レポートが整いました。以下よりご確認ください。</p>

      <p style="margin:18px 0">
        <a href="${url}" style="display:inline-block;padding:12px 16px;background:#111;color:#fff;text-decoration:none;border-radius:8px">
          ▶ レポートを開く
        </a>
      </p>

      <p><strong>🌟50名以下の組織の皆さまへ</strong><br/>診断アプリのご紹介・シェアにご協力ください。</p>
      <p><strong>🌟51名以上の組織の皆さまへ</strong><br/>詳細レポート特典として<u>無料個別相談</u>をご案内しています。</p>

      <hr style="border:none;border-top:1px solid #eee;margin:24px 0" />
      <p>ご不明点はこのメールに<strong>そのまま返信</strong>してください。</p>
      <p style="font-size:12px;color:#555">本メールは IOT の診断サービスより自動送信されています。</p>
    </div>
  `.trim();

  return { subject, html, text: `${subject}\n\n${url}` };
}

// ------------------------------------------------------------
// V2 拡張テンプレは別ファイルに実装
// ------------------------------------------------------------
export { buildReportEmailV2 } from "./emailTemplatesV2";
export type { ReportEmailV2Input } from "./emailTemplatesV2";
