// lib/emailTemplates.ts
// ─ メール本文テンプレ & URLユーティリティ（互換APIを全部カバー）─

const BRAND_JA = '一般社団法人 企業の未来づくり研究所';
const BRAND_EN = 'Institute for Our Transformation';
const BRAND_SHORT = 'IOT（企業の未来づくり研究所）';

// ===== App URL（末尾スラ無し）=====
export const APP_URL = (
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
).replace(/\/+$/, '');

// 共有用URL（指定があればそれを使う）
const SHARE_URL = (process.env.NEXT_PUBLIC_SHARE_URL || APP_URL).replace(/\/+$/, '/');
// LINEオープンチャット（既存env or 既定）
const OPENCHAT_URL = process.env.NEXT_PUBLIC_LINE_OC_URL || 'https://x.gd/9RRcN';

// ===== レポートURL =====
export const REPORT_URL = (id: string) =>
  `${APP_URL}/report?resultId=${encodeURIComponent(id)}`;
export const reportUrl = REPORT_URL; // 互換

// ===== 相談予約URL（SPIR or 自社フォーム）=====
const SPIR_ISHIJIMA = process.env.SPIR_ISHIJIMA_URL?.trim();
const SPIR_MORIGAMI  = process.env.SPIR_MORIGAMI_URL?.trim();

export type Consultant = 'ishijima' | 'morigami' | undefined;

export const bookingUrlFor = (
  c?: Consultant,
  resultId?: string,
  email?: string
) => {
  const base =
    c === 'morigami' ? (SPIR_MORIGAMI || `${APP_URL}/consult/start`) :
    c === 'ishijima' ? (SPIR_ISHIJIMA || `${APP_URL}/consult/start`) :
    `${APP_URL}/consult/start`;

  const params = new URLSearchParams();
  if (resultId) params.set('resultId', resultId);
  if (email)    params.set('email', email);
  const qs = params.toString();

  return qs ? `${base}${base.includes('?') ? '&' : '?'}${qs}` : base;
};

// ===== 署名 =====
const SIGNATURE_TEXT = `
${BRAND_JA}
(${BRAND_EN})
https://ourdx-mtg.com/
お問合せ先 : info@ourdx-mtg.com
〒150-0001 東京都渋谷区神宮前6-29-4 原宿小宮ビル6F
`.trim();

const SIGNATURE_HTML = `
<div style="font-size:12px;line-height:1.7;color:#666">
  ${BRAND_JA}<br/>
  <em>${BRAND_EN}</em><br/>
  <a href="https://ourdx-mtg.com/" target="_blank" rel="noopener">https://ourdx-mtg.com/</a><br/>
  お問合せ先：<a href="mailto:info@ourdx-mtg.com">info@ourdx-mtg.com</a><br/>
  〒150-0001 東京都渋谷区神宮前6-29-4 原宿小宮ビル6F
</div>
`.trim();

// ===== 型 =====
export type CompanySize =
  | '1-10' | '11-50' | '51-100' | '101-300' | '301-500' | '501-1000' | '1001+'
  | string; // 許容（日本語ラベル等）

const is51Plus = (v?: CompanySize): boolean => {
  if (!v) return false;
  const s = String(v);
  // 英語表記 / 日本語ラベルどちらも許容
  if (/(^51-)|(^101-)|(^301-)|(^501-)|1001\+/.test(s)) return true;
  if (/51～100|101～300|301～1000|1001名以上|51名以上/.test(s)) return true;
  return false;
};

// ===== 申込者向け（会社規模で文面分岐）=====
export function renderReportRequestMailToUser(args: {
  name: string;
  resultId?: string;
  companySize: CompanySize; // 寛容化
  consultant?: Consultant;
  email?: string;
}) {
  const large = is51Plus(args.companySize);
  const rUrl = args.resultId ? REPORT_URL(args.resultId) : undefined;
  const bUrl = bookingUrlFor(args.consultant, args.resultId, args.email);

  if (large) {
    // 51名以上：特典相談＋OC
    const subject = '【武将タイプ診断】詳細レポートURLのご案内／無料個別相談（特典）';
    const text = `
${args.name} 様

「AI時代の経営者 武将タイプ診断」をご利用いただきありがとうございます。
${rUrl ? `下記URLから詳細レポートをご確認いただけます。\n\n▼レポート\n${rUrl}\n` : ''}

▼無料個別相談（特典／従業員51名以上の企業様）
読み解き・次の一手・90日アクション案を一緒に整理します。
${bUrl}

▼最新情報・交流（LINEオープンチャット）
${OPENCHAT_URL}

${SIGNATURE_TEXT}
    `.trim();

    const html = `
<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;">
  <p>${args.name} 様</p>
  <p>「AI時代の経営者 武将タイプ診断」をご利用いただきありがとうございます。</p>
  ${rUrl ? `<p>▼レポート<br/><a href="${rUrl}" target="_blank" rel="noopener">${rUrl}</a></p>` : ''}
  <p>▼無料個別相談（<b>特典／従業員51名以上の企業様</b>）<br/>
     読み解き・次の一手・90日アクション案を一緒に整理します。<br/>
     <a href="${bUrl}" target="_blank" rel="noopener">予約ページを開く</a>
  </p>
  <p>▼最新情報・交流（LINEオープンチャット）<br/>
     <a href="${OPENCHAT_URL}" target="_blank" rel="noopener">${OPENCHAT_URL}</a></p>
  <hr style="border:none;border-top:1px solid #eee;margin:20px 0" />
  ${SIGNATURE_HTML}
</div>
    `.trim();

    return { subject, text, html };
  }

  // 50名以下：拡散＋OCのみ（申込導線ナシ）
  const subject = '【武将タイプ診断】詳細レポートURLのご案内';
  const text = `
${args.name} 様

「AI時代の経営者 武将タイプ診断」をご利用いただきありがとうございます。
${rUrl ? `下記URLから詳細レポートをご確認いただけます。\n\n▼レポート\n${rUrl}\n` : ''}

もし価値を感じていただけたら、SNSなどでのご紹介・拡散にご協力ください。
▼紹介用リンク
${SHARE_URL}

▼最新情報・交流（LINEオープンチャット）
${OPENCHAT_URL}

${SIGNATURE_TEXT}
  `.trim();

  const html = `
<div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;">
  <p>${args.name} 様</p>
  <p>「AI時代の経営者 武将タイプ診断」をご利用いただきありがとうございます。</p>
  ${rUrl ? `<p>▼レポート<br/><a href="${rUrl}" target="_blank" rel="noopener">${rUrl}</a></p>` : ''}
  <p>もし価値を感じていただけたら、SNS等でのご紹介・拡散にご協力ください。</p>
  <p>▼紹介用リンク<br/><a href="${SHARE_URL}" target="_blank" rel="noopener">${SHARE_URL}</a></p>
  <p>▼最新情報・交流（LINEオープンチャット）<br/>
     <a href="${OPENCHAT_URL}" target="_blank" rel="noopener">${OPENCHAT_URL}</a></p>
  <hr style="border:none;border-top:1px solid #eee;margin:20px 0" />
  ${SIGNATURE_HTML}
</div>
  `.trim();

  return { subject, text, html };
}

// ===== 運用向け（詳細レポ申込通知）=====
export function renderReportRequestMailToOps(args: {
  email: string;
  name: string;
  companyName?: string;
  companySize: CompanySize;
  industry: string;
  resultId?: string;
}) {
  const subject = '【samurai-check】詳細レポート申込 受付';
  const text = `
▼申込内容
氏名: ${args.name}
メール: ${args.email}
会社名: ${args.companyName || '-'}
会社規模: ${args.companySize}
業種: ${args.industry}
診断ID: ${args.resultId || '-'}
  `.trim();

  const html = `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;">
    <h3 style="margin:0 0 12px;">詳細レポート申込 受付</h3>
    <table style="border-collapse:collapse;">
      <tr><td style="padding:4px 8px;color:#666;">氏名</td><td style="padding:4px 8px;">${args.name}</td></tr>
      <tr><td style="padding:4px 8px;color:#666;">メール</td><td style="padding:4px 8px;">${args.email}</td></tr>
      <tr><td style="padding:4px 8px;color:#666;">会社名</td><td style="padding:4px 8px;">${args.companyName || '-'}</td></tr>
      <tr><td style="padding:4px 8px;color:#666;">会社規模</td><td style="padding:4px 8px;">${args.companySize}</td></tr>
      <tr><td style="padding:4px 8px;color:#666;">業種</td><td style="padding:4px 8px;">${args.industry}</td></tr>
      <tr><td style="padding:4px 8px;color:#666;">診断ID</td><td style="padding:4px 8px;">${args.resultId || '-'}</td></tr>
    </table>
  </div>
  `.trim();

  return { subject, text, html };
}

// ===== 相談申込：ユーザー向け 自動返信（特典）=====
export function renderConsultIntakeMailToUser(args: {
  name: string;
  consultant?: Consultant;
  resultId?: string;
  email?: string;
}) {
  const bUrl = bookingUrlFor(args.consultant, args.resultId, args.email);
  const rUrl  = args.resultId ? REPORT_URL(args.resultId) : undefined;

  const subject = '【武将タイプ診断アプリ特典】無料個別相談のご案内（今すぐ予約OK）';
  const text = `
${args.name} 様

「AI時代の経営者 武将タイプ診断」の詳細レポートお申込み、ありがとうございます。
本メールは <特典> 無料個別相談（従業員51名以上の企業の経営者・役員向け）のご案内です。
下記の予約リンクからご都合の良い日時をご選択ください。

予約リンク：
${bUrl}
${rUrl ? `\n参考：診断レポート\n${rUrl}\n` : ''}

${SIGNATURE_TEXT}
  `.trim();

  const html = `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;">
    <p>${args.name} 様</p>
    <p>「AI時代の経営者 武将タイプ診断」の<b>詳細レポートお申込み</b>ありがとうございます。<br/>
       本メールは<b>特典：無料個別相談</b>（従業員51名以上の企業の経営者・役員向け）のご案内です。</p>
    <p><a href="${bUrl}" target="_blank" rel="noopener">予約ページを開く</a></p>
    ${rUrl ? `<p>参考：レポート <a href="${rUrl}" target="_blank" rel="noopener">${rUrl}</a></p>` : ''}
    <hr style="border:none;border-top:1px solid #eee;margin:20px 0" />
    ${SIGNATURE_HTML}
  </div>
  `.trim();

  return { subject, text, html };
}

/* ------------------------------------------------------------------
   互換API：buildConsultEmail
-------------------------------------------------------------------*/
type BuildV1 = { name: string; consultant?: Consultant; resultId?: string; email?: string; };
type BuildV2 = { toName: string; reportUrl: string; bookingUrl: string; offerNote?: string; };

export function buildConsultEmail(args: BuildV1 | BuildV2) {
  if ('toName' in args) {
    // 旧Bパターン
    const subject = '【武将タイプ診断】詳細レポートのご案内（特典のご利用も可）';
    const text = `
${args.toName} 様

詳細レポートをご確認いただけます。
▼レポート
${args.reportUrl}

▼無料個別相談（従業員51名以上の企業様向け特典）
${args.bookingUrl}
${args.offerNote ? `\n※${args.offerNote}` : ''}

${SIGNATURE_TEXT}
`.trim();

    const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;">
      <p>${args.toName} 様</p>
      <p>詳細レポートをご確認いただけます。</p>
      <p>▼レポート<br/><a href="${args.reportUrl}" target="_blank" rel="noopener">${args.reportUrl}</a></p>
      <p>▼無料個別相談（<b>従業員51名以上の企業様向け特典</b>）<br/><a href="${args.bookingUrl}" target="_blank" rel="noopener">${args.bookingUrl}</a></p>
      ${args.offerNote ? `<p style="color:#444;">※${args.offerNote}</p>` : ''}
      <hr style="border:none;border-top:1px solid #eee;margin:20px 0" />
      ${SIGNATURE_HTML}
    </div>
    `.trim();

    return { subject, text, html };
  }

  // 旧Aパターン → 相談自動返信をそのまま返す
  return renderConsultIntakeMailToUser(args);
}
