// lib/emailTemplates.ts
// 相談受付メール（ユーザー向け／社内向け）＋ レポート系（v2 の再エクスポート）

/* =========================
   共通ユーティリティ
========================= */

function toText(html: string): string {
  return String(html ?? "")
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n")
    .replace(/<[^>]+>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

/* =========================
   相談受付メール（自前実装）
========================= */

// 既存コードとの互換のため、エイリアスを広めに吸収
export type ConsultMailArgs = {
  // 受信者（ユーザー）
  toEmail?: string;         // 推奨
  toName?: string;          // 推奨
  // 旧名・別名も許容（既存導線の互換）
  email?: string;
  name?: string;

  company?: string;
  note?: string;
  rid?: string;
  consultLink?: string;
};

export type MailParts = {
  subject: string;
  html: string;
  text: string;
};

function normalizeConsultArgs(a: ConsultMailArgs) {
  const to = String(a.toEmail ?? a.email ?? "").trim();
  const name = String(a.toName ?? a.name ?? "").trim();
  return {
    to,
    name,
    company: a.company ?? "",
    note: a.note ?? "",
    rid: a.rid ?? "",
    consultLink: a.consultLink ?? "",
  };
}

/**
 * 相談受付メールを生成（ユーザー向け／運営向けの 2通ぶん返す）
 */
export function buildConsultEmail(
  args: ConsultMailArgs
): { user: MailParts; ops: MailParts } {
  const { name, company, note, rid, consultLink } = normalizeConsultArgs(args);

  // --- ユーザー向け ---
  const userSubject = "【相談受付】お申込みありがとうございます";
  const userHtml = `
    <p>${name || "ご担当者様"}、このたびはお問い合わせありがとうございます。</p>
    ${company ? `<p>会社名：${company}</p>` : ""}
    ${note ? `<p>メモ：${note}</p>` : ""}
    ${
      consultLink
        ? `<p><a href="${consultLink}">こちらから日程のご調整</a>が可能です。</p>`
        : ""
    }
    ${rid ? `<p>RID：${rid}</p>` : ""}
  `.trim();

  const user: MailParts = {
    subject: userSubject,
    html: userHtml,
    text: toText(userHtml),
  };

  // --- 運営向け ---
  const opsSubject = `【相談受付】${name || "（お名前不明）"}${rid ? ` / RID:${rid}` : ""}`;
  const opsHtml = `
    <p>新規の相談受付がありました。</p>
    ${company ? `<p>会社名：${company}</p>` : ""}
    ${name ? `<p>お名前：${name}</p>` : ""}
    ${note ? `<p>メモ：${note}</p>` : ""}
    ${rid ? `<p>RID：${rid}</p>` : ""}
    ${
      consultLink
        ? `<p>予約導線：<a href="${consultLink}">${consultLink}</a></p>`
        : ""
    }
  `.trim();

  const ops: MailParts = {
    subject: opsSubject,
    html: opsHtml,
    text: toText(opsHtml),
  };

  return { user, ops };
}

/** 互換 API：既存のルートが参照しているため露出（片側だけ返すラッパ） */
export const renderConsultIntakeMailToUser = (args: ConsultMailArgs): MailParts =>
  buildConsultEmail(args).user;

export const renderConsultIntakeMailToOps = (args: ConsultMailArgs): MailParts =>
  buildConsultEmail(args).ops;

/* =========================
   レポート系（v2 を再エクスポート）
========================= */

// v2 実装そのもの
export { buildReportEmailV2 } from "./emailTemplatesV2";

// 互換: 旧名で import されても v2 を使う
export { buildReportEmailV2 as buildReportEmail } from "./emailTemplatesV2";

// --- 型の逆算（ローカルに値バインディングを作らず type 参照だけにする）
type _BuildReportEmailV2 = typeof import("./emailTemplatesV2").buildReportEmailV2;
export type ReportEmailV2Input = Parameters<_BuildReportEmailV2>[0];
export type ReportMailArgsV2   = ReportEmailV2Input;
