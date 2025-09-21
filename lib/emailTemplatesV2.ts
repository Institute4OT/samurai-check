// /lib/emailTemplatesV2.ts
// ============================================================
// 詳細レポート通知メール（V2・フル版）
// ・宛名に「様」付与
// ・会社規模で導線をセグメント（<=50: シェア/LINE、>=51: 相談CTA）
// ・プレヘッダー、HTML/テキスト両方返却
// ・フッターに IOT 情報（社名・住所・連絡先）を明記
// ・★レポートURLは /report/<rid> 固定（UTMのみ付与。rid/emailはクエリ付与しない）★
// ============================================================

export type MailRender = { subject: string; html: string; text: string };

export type ReportEmailV2Input = {
  rid?: string;
  typeName?: string;
  toName?: string;
  email?: string;
  companySize?: string; // '1～10名' | '11～50名' | '51～100名' | '1001名以上' など表記ゆれ許容
  reportLink?: string; // 既定: `${APP_BASE}/report/${rid}`
  consultLink?: string; // 既定: `${BOOKING_BASE}`
  lineOcUrl?: string; // 任意（なければ env を使用）
  titlePrefix?: string; // 既定: 【武将タイプ診断アプリ】
  shareLink?: string; // 既定: `${SHARE_BASE}`
};

const APP_BASE = (
  process.env.NEXT_PUBLIC_APP_URL ||
  process.env.NEXT_PUBLIC_BASE_URL ||
  "http://localhost:3000"
).replace(/\/$/, "");

const SHARE_BASE = (
  process.env.NEXT_PUBLIC_SHARE_URL || APP_BASE
).replace(/\/$/, "");

const BOOKING_BASE = (
  process.env.NEXT_PUBLIC_BOOKING_URL || `${APP_BASE}/consult`
).replace(/\/$/, "");

const LINE_OC_URL = (process.env.NEXT_PUBLIC_LINE_OC_URL || "").trim();

const IOT_MAIL = process.env.MAIL_REPLY_TO || "info@ourdx-mtg.com";
const IOT_ADDR = "〒150-0001 東京都渋谷区神宮前6-29-4 原宿小宮ビル6F";
const IOT_NAME_JA =
  "一般社団法人 企業の未来づくり研究所（Institute for Our Transformation）";

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
  try {
    const u = new URL(url);
    if (rid && !u.searchParams.has("rid")) u.searchParams.set("rid", rid);
    if (email && !u.searchParams.has("email")) u.searchParams.set("email", email);
    if (campaign) {
      if (!u.searchParams.has("utm_source")) u.searchParams.set("utm_source", "email");
      if (!u.searchParams.has("utm_medium")) u.searchParams.set("utm_medium", "transactional");
      if (!u.searchParams.has("utm_campaign")) u.searchParams.set("utm_campaign", campaign);
    }
    return u.toString();
  } catch {
    return url;
  }
}

// ★UTMのみ付与（rid/emailは付けない）
function addUtmOnly(url: string, campaign: string, content: string, utmId?: string) {
  try {
    const u = new URL(url);
    if (!u.searchParams.has("utm_source")) u.searchParams.set("utm_source", "samurai-check");
    if (!u.searchParams.has("utm_medium")) u.searchParams.set("utm_medium", "email");
    if (!u.searchParams.has("utm_campaign")) u.searchParams.set("utm_campaign", campaign);
    if (!u.searchParams.has("utm_content")) u.searchParams.set("utm_content", content);
    if (utmId && !u.searchParams.has("utm_id")) u.searchParams.set("utm_id", utmId);
    return u.toString();
  } catch {
    return url;
  }
}

/** 会社規模：'small' (<=50) / 'large' (>=51) */
function sizeBucket(v?: string) {
  if (!v) return "small";
  const s = String(v).trim();
  const t = s
    .replace(/[〜～~–—－]/g, "-")
    .replace(/名/g, "")
    .replace(/\s+/g, "")
    .toLowerCase();

  const mPlus = t.match(/(\d+)\s*(\+|以上)$/);
  if (mPlus) {
    const n = Number(mPlus[1]);
    return n >= 51 ? "large" : "small";
  }
  if (/(\d+)\s*以下$/.test(t)) {
    const n = Number(RegExp.$1);
    return n <= 50 ? "small" : "large";
  }
  const mRange = t.match(/(\d+)\s*-\s*(\d+)/);
  if (mRange) {
    const max = Number(mRange[2]);
    return max <= 50 ? "small" : "large";
  }
  if (/^(1-10|11-50)$/.test(t)) return "small";
  if (/^(51-100|101-300|301-1000|1001-.*|1001\+|1001以上)$/.test(t)) return "large";
  return "small";
}

function esc(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

export function buildReportEmailV2(input: ReportEmailV2Input): MailRender {
  const rid = input.rid || "unknown-id";
  const typeName = input.typeName || "（タイプ判定中）";
  const toName = ensureSama(input.toName);
  const bucket = sizeBucket(input.companySize);

  // ★レポートURLは /report/<rid> 固定。UTMのみ付与（rid/emailは付けない）
  const reportBase = input.reportLink || `${APP_BASE}/report/${encodeURIComponent(rid)}`;
  const reportUrl = addUtmOnly(reportBase, "report_ready", "cta_report", rid);

  // 相談／シェア／LINE は従来通り rid/email を付与してOK
  const consultUrl = withRidEmailUtm(
    input.consultLink || BOOKING_BASE,
    rid,
    input.email,
    "consult_cta",
  );

  const shareUrl = withRidEmailUtm(
    input.shareLink || SHARE_BASE,
    rid,
    input.email,
    "share_cta",
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

  const prefix = input.titlePrefix || "【武将タイプ診断アプリ】";
  const subject =
    `${prefix} ▶ ${typeName}｜` +
    `■詳細レポートのご案内` +
    `${bucket === "small" ? "（シェア歓迎）" : "（特典：無料個別相談）」"} ` +
    `（ID: ${rid}）`;

  const preheader =
    "診断の詳細レポートをご確認ください。会社規模に応じた次のアクションもご案内します。";

  const segSmallHtml = `
    <p><strong>🌟 50名以下の組織の皆さまへ</strong><br/>
      診断アプリのご紹介・シェアにご協力ください（経営者仲間やSNSでの拡散をお願いします）。</p>
    <p style="margin:14px 0 0">
      <a href="${shareUrl}" style="display:inline-block;padding:10px 16px;border:1px solid #111;border-radius:8px;text-decoration:none">
        ▶ 診断アプリを紹介・シェアする
      </a>
    </p>
    ${lineUrl ? `<p style="font-size:12px;color:#555;margin-top:10px">情報交換用の LINE オープンチャットも開設しています：<a href="${lineUrl}">参加リンク</a></p>` : ""}
  `;

  const segLargeHtml = `
    <p><strong>🌟 51名以上の組織の皆さまへ</strong><br/>
      診断レポート特典として、<u>無料個別相談</u>をご案内しています。</p>
    <p style="margin:14px 0 0">
      <a href="${consultUrl}" style="display:inline-block;padding:10px 16px;border:1px solid #111;border-radius:8px;text-decoration:none">
        ▶ 無料個別相談を申し込む
      </a>
    </p>
    ${lineUrl ? `<p style="font-size:12px;color:#555;margin-top:10px">情報交換用の LINE オープンチャットも開設しています：<a href="${lineUrl}">参加リンク</a></p>` : ""}
  `;

  const footerHtml = `
    <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
    <div style="font-size:12px;color:#555;line-height:1.6">
      <div>${IOT_NAME_JA}</div>
      <div>📧 <a href="mailto:${IOT_MAIL}">${IOT_MAIL}</a></div>
      <div>${IOT_ADDR}</div>
      <div style="margin-top:6px;">このメールにそのまま返信していただいてもOKです。</div>
    </div>
  `;

  const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,'Apple Color Emoji','Segoe UI Emoji';line-height:1.7;color:#111">
      <div style="display:none;max-height:0;overflow:hidden;color:transparent;opacity:0;visibility:hidden">${esc(preheader)}</div>

      <p>${esc(toName)}、こんにちは。IOT（企業の未来づくり研究所）です。</p>
      <p>診断の詳細レポートが整いました。以下よりご確認ください。</p>

      <p style="margin:18px 0;">
        <a href="${reportUrl}" style="display:inline-block;padding:12px 16px;background:#111;color:#fff;text-decoration:none;border-radius:8px;">
          ▶ レポートを開く
        </a>
      </p>

      ${bucket === "small" ? segSmallHtml : segLargeHtml}

      ${footerHtml}
    </div>
  `.trim();

  const text =
    `${subject}\n\n` +
    `▼レポート: ${reportUrl}\n` +
    (bucket === "small"
      ? `▼シェアURL: ${shareUrl}\n` + (lineUrl ? `▼LINE OC: ${lineUrl}\n` : "")
      : `▼無料個別相談: ${consultUrl}\n` + (lineUrl ? `▼LINE OC: ${lineUrl}\n` : "")) +
    `\n${IOT_NAME_JA}\n` +
    `📧 ${IOT_MAIL}\n` +
    `${IOT_ADDR}\n` +
    `\nご不明点はこのメールにそのまま返信してください。`;

  return { subject, html, text };
}

export default buildReportEmailV2;
