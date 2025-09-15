// /lib/emailTemplatesV2.ts
// ============================================================
// 詳細レポート通知メール（V2・単独で動くフル版）
// ・宛名に「様」付与
// ・rid / email / UTM を常に付与
// ・会社規模で導線をセグメント（<=50: シェア/LINE、>=51: 相談CTA）
// ・プレヘッダー、HTML/テキスト両方返却
// ============================================================

export type MailRender = { subject: string; html: string; text: string };

export type ReportEmailV2Input = {
  rid?: string;
  typeName?: string;
  toName?: string;
  email?: string;
  companySize?: string; // '1-10' | '11-50' | '51-100' | '101-300' | ...
  reportLink?: string; // 既定: `${APP_BASE}/report/${rid}`
  consultLink?: string; // 既定: `${BOOKING_BASE}`
  lineOcUrl?: string; // 任意（なければ env を使用）
  titlePrefix?: string; // 既定: 【武将タイプ診断】
};

const APP_BASE = (
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXT_PUBLIC_BASE_URL ||
  "http://localhost:3000"
).replace(/\/$/, "");
const BOOKING_BASE = (
  process.env.NEXT_PUBLIC_BOOKING_URL || `${APP_BASE}/consult`
).replace(/\/$/, "");
const LINE_OC_URL = (process.env.NEXT_PUBLIC_LINE_OC_URL || "").trim();

function ensureSama(name?: string | null) {
  const n = (name ?? "").trim();
  if (!n) return "ご担当者様";
  return /様$/.test(n) ? n : `${n} 様`;
}

function withRidEmailUtm(
  url: string,
  rid?: string,
  email?: string,
  campaign?: string,
) {
  const u = new URL(url);
  if (rid && !u.searchParams.has("rid")) u.searchParams.set("rid", rid);
  if (email && !u.searchParams.has("email")) u.searchParams.set("email", email);
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

function sizeBucket(size?: string) {
  if (!size) return "small";
  const s = String(size).toLowerCase();
  // “1–10” の長いダッシュ表記なども拾う
  if (
    s.includes("1-10") ||
    s.includes("11-50") ||
    s.includes("1–10") ||
    s.includes("11–50")
  )
    return "small";
  return "large";
}

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function buildReportEmailV2(input: ReportEmailV2Input): MailRender {
  const rid = input.rid || "unknown-id";
  const typeName = input.typeName || "（タイプ判定中）";
  const toName = ensureSama(input.toName);
  const bucket = sizeBucket(input.companySize);

  const reportUrl = withRidEmailUtm(
    input.reportLink || `${APP_BASE}/report/${encodeURIComponent(rid)}`,
    rid,
    input.email,
    "report_ready",
  );
  const consultUrl = withRidEmailUtm(
    input.consultLink || BOOKING_BASE,
    rid,
    input.email,
    "consult_cta",
  );
  const lineUrl =
    input.lineOcUrl || LINE_OC_URL
      ? withRidEmailUtm(
          (input.lineOcUrl || LINE_OC_URL)!,
          rid,
          input.email,
          "line_oc_cta",
        )
      : "";

  const prefix = input.titlePrefix || "【武将タイプ診断】";
  const subject = `${prefix} ▶ ${typeName} ｜ ■詳細レポートのご案内（シェア歓迎） （ID: ${rid}）`;

  const preheader =
    "診断の詳細レポートをご確認ください。会社規模に応じた次のアクションもご案内します。";

  const segSmallHtml = `
    <p><strong>🌟 50名以下の組織の皆さまへ</strong><br/>
      診断アプリのご紹介・シェアにご協力ください（経営者仲間やSNSでの拡散をお願いします）。</p>
    ${
      lineUrl
        ? `
      <p style="margin:14px 0 0">
        <a href="${lineUrl}" style="display:inline-block;padding:10px 16px;border:1px solid #0b8f4d;border-radius:8px;text-decoration:none">
          LINEオープンチャットに参加する
        </a>
      </p>`
        : ""
    }
  `;

  const segLargeHtml = `
    <p><strong>🌟 51名以上の組織の皆さまへ</strong><br/>
      詳細レポート特典として、<u>無料個別相談</u>をご案内しています。</p>
    <p style="margin:14px 0 0">
      <a href="${consultUrl}" style="display:inline-block;padding:10px 16px;border:1px solid #111;border-radius:8px;text-decoration:none">
        無料個別相談を申し込む
      </a>
    </p>
    ${lineUrl ? `<p style="font-size:12px;color:#555;margin-top:10px">※ 情報交換用の LINE オープンチャットも開設しています：<a href="${lineUrl}">参加リンク</a></p>` : ""}
  `;

  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,'Apple Color Emoji','Segoe UI Emoji';line-height:1.7;color:#111">
      <!-- プレヘッダー（多くのメーラーで冒頭に表示） -->
      <div style="display:none;max-height:0;overflow:hidden;color:transparent;opacity:0;visibility:hidden">${esc(preheader)}</div>

      <p>${esc(toName)}、こんにちは。IOT（企業の未来づくり研究所）です。</p>
      <p>診断の詳細レポートが整いました。以下よりご確認ください。</p>

      <p style="margin:18px 0;">
        <a href="${reportUrl}" style="display:inline-block;padding:12px 16px;background:#111;color:#fff;text-decoration:none;border-radius:8px;">
          ▶ レポートを開く
        </a>
      </p>

      ${bucket === "small" ? segSmallHtml : segLargeHtml}

      <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
      <p>ご不明点があれば、このメールに<strong>そのまま返信</strong>してください。</p>
      <p style="font-size:12px;color:#555">本メールは IOT の診断サービスより自動送信されています。</p>
    </div>
  `.trim();

  const text =
    `${subject}\n\n` +
    `▼レポート: ${reportUrl}\n` +
    (bucket === "small"
      ? (lineUrl ? `▼LINE OC: ${lineUrl}\n` : "") +
        `シェアのご協力をお願いします。`
      : `▼無料個別相談: ${consultUrl}\n` +
        (lineUrl ? `LINE OC: ${lineUrl}\n` : "")) +
    `\n\nご不明点はこのメールにそのまま返信してください。`;

  return { subject, html, text };
}

export default buildReportEmailV2;
