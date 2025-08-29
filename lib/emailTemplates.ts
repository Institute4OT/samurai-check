// lib/emailTemplates.ts
// ─ メール本文のテンプレ & URLユーティリティ ─

const BRAND = 'IOT（企業の未来づくり研究所）';

// ベースURL: NEXT_PUBLIC_APP_URL > VERCEL_URL > localhost
export const APP_URL = (
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
).replace(/\/+$/, '');

// /report?resultId=<id>
export const REPORT_URL = (id: string) =>
  `${APP_URL}/report?resultId=${encodeURIComponent(id)}`;

// SPIR 予約URL（コンサル出し分け＆resultId と email を付与）
const SPIR_ISHIJIMA = process.env.SPIR_ISHIJIMA_URL?.trim();
const SPIR_MORIGAMI  = process.env.SPIR_MORIGAMI_URL?.trim();

export type Consultant = 'ishijima' | 'morigami' | undefined;

/**
 * 相談予約用URLを生成（SPIR直/自社フォームどちらでもOK）
 * - base: consultant に応じて SPIR_* or /consult/start
 * - クエリ: resultId, email を必要に応じて付与
 */
export const bookingUrlFor = (c?: Consultant, resultId?: string, email?: string) => {
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

const SHARE_URL = APP_URL;

/* ========== 申込者向け：詳細レポ受付（会社規模で分岐） ========== */

type CompanySize =
  | '1-10' | '11-50' | '51-100' | '101-300' | '301-500' | '501-1000' | '1001+';

/**
 * 申込者向け：受付完了（≤50はシェア案内、≥51は無料相談案内つき）
 * - レポURLは必ず /report?resultId=... 形式に統一
 * - 相談URLには resultId/email を付けて受け渡し安定化
 */
export function renderReportRequestMailToUser(args: {
  name: string;
  resultId?: string;
  companySize: CompanySize;
  consultant?: Consultant;
  email?: string; // 相談リンクに引き回す（任意）
}) {
  const isLarge = !['1-10', '11-50'].includes(args.companySize);
  const reportUrl = args.resultId ? REPORT_URL(args.resultId) : undefined;
  const bookingUrl = bookingUrlFor(args.consultant, args.resultId, args.email);

  if (isLarge) {
    // 51名以上：無料個別相談のご案内も同梱
    const subject = '【受付】詳細レポート＋無料個別相談のご案内';
    const text = `
${args.name} 様

詳細レポートのお申込みありがとうございます。
${reportUrl ? `下記URLから今すぐご確認いただけます。\n\n▼レポート確認\n${reportUrl}\n` : ''}

▼無料個別相談（読み解き／次の一手／90日アクション案）
${bookingUrl}

このメールに直接ご返信いただいてもOKです（返信先：info@ourdx-mtg.com）。
${BRAND}
https://ourdx-mtg.com/
    `.trim();

    const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;">
      <p>${args.name} 様</p>
      <p>詳細レポートのお申込みありがとうございます。</p>
      ${reportUrl ? `<p>▼レポート確認<br/><a href="${reportUrl}" target="_blank" rel="noopener">${reportUrl}</a></p>` : ''}
      <p>▼無料個別相談（読み解き／次の一手／90日アクション案）<br/>
        <a href="${bookingUrl}" target="_blank" rel="noopener">${bookingUrl}</a>
      </p>
      <p>このメールに直接ご返信いただいてもOKです（返信先：info@ourdx-mtg.com）。</p>
      <hr style="border:none;border-top:1px solid #eee;margin:20px 0" />
      <p style="font-size:12px;color:#666;">${BRAND}<br/><a href="https://ourdx-mtg.com/">https://ourdx-mtg.com/</a></p>
    </div>
    `.trim();

    return { subject, text, html };
  }

  // 50名以下：アンバサダー（シェアのお願い）
  const subject = '【受付】詳細レポート準備中｜ご協力のお願い';
  const text = `
${args.name} 様

詳細レポートのお申込みありがとうございます。
${reportUrl ? `下記URLから今すぐご確認いただけます。\n\n▼レポート確認\n${reportUrl}\n` : ''}
小さな団体の取り組みです。価値を感じていただけたら、経営者仲間へ共有いただけると励みになります。

▼紹介用リンク
${SHARE_URL}

ひとこと応援コメントも大歓迎です。このメールにご返信いただいてもOKです。

${BRAND}
https://ourdx-mtg.com/
  `.trim();

  const html = `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;">
    <p>${args.name} 様</p>
    <p>詳細レポートのお申込みありがとうございます。</p>
    ${reportUrl ? `<p>▼レポート確認<br/><a href="${reportUrl}" target="_blank" rel="noopener">${reportUrl}</a></p>` : ''}
    <p>価値を感じていただけたら、経営者仲間へ共有いただけると励みになります。</p>
    <p>▼紹介用リンク<br/><a href="${SHARE_URL}" target="_blank" rel="noopener">${SHARE_URL}</a></p>
    <p>ひとこと応援コメントも大歓迎です（このメールにご返信ください）。</p>
    <hr style="border:none;border-top:1px solid #eee;margin:20px 0" />
    <p style="font-size:12px;color:#666;">${BRAND}<br/><a href="https://ourdx-mtg.com/">https://ourdx-mtg.com/</a></p>
  </div>
  `.trim();

  return { subject, text, html };
}

/* ========== 運用(IOT)向け：申込内容通知 ========== */

export function renderReportRequestMailToOps(args: {
  email: string;
  name: string;
  companyName?: string;
  companySize: CompanySize;
  industry:
    | '製造' | 'IT・ソフトウェア' | '医療・福祉' | '金融' | '物流・運輸'
    | '建設' | '小売・卸' | '飲食・宿泊' | '教育・研究' | '不動産'
    | 'メディア・広告' | 'エネルギー' | '農林水産' | '公共・行政'
    | 'サービス' | 'その他';
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

/* ========== 相談申込 自動返信テンプレ（APIから呼び出し） ========== */
export function renderConsultIntakeMailToUser(args: {
  name: string;
  consultant?: Consultant;   // 'ishijima' | 'morigami'
  resultId?: string;         // あれば /report?resultId=... も案内
  email?: string;            // 相談URLにクエリで付与
}) {
  // resultId / email をクエリで付与（SPIRでも自社フォームでも受け渡し安定）
  const bookingUrl = bookingUrlFor(args.consultant, args.resultId, args.email);
  const reportUrl  = args.resultId ? REPORT_URL(args.resultId) : undefined;

  const subject = '【受付】無料個別相談のご案内（今すぐ予約OK）';
  const text = `
${args.name} 様

無料個別相談のお申込みありがとうございます。
下記の予約リンクからご都合の良い日時をご選択ください。

予約リンク：
${bookingUrl}
${reportUrl ? `\n参考：診断レポート\n${reportUrl}\n` : ''}`.trim();

  const html = `
  <p>${args.name} 様</p>
  <p>無料個別相談のお申込みありがとうございます。<br>
     下記の予約リンクからご都合の良い日時をご選択ください。</p>
  <p><a href="${bookingUrl}" target="_blank" rel="noopener">予約ページを開く</a></p>
  ${reportUrl ? `<p>参考：レポート <a href="${reportUrl}" target="_blank" rel="noopener">${reportUrl}</a></p>` : ''}
  `.trim();

  return { subject, text, html };
}

/* ========== 相談申込：運用(IOT)向け通知（API互換） ========== */
// ※ Vercelビルドで要求されていた互換エクスポート
export function renderConsultIntakeMailToOps(args: {
  name?: string;
  email?: string;
  tel?: string;
  companyName?: string;
  companySize?: CompanySize | string;
  industry?: string;
  resultId?: string;
  message?: string;
}) {
  const subject = '【通知】無料相談の新規申込みがありました';
  const lines = [
    `氏名: ${args.name ?? ''}`,
    `メール: ${args.email ?? ''}`,
    `電話: ${args.tel ?? ''}`,
    `会社名: ${args.companyName ?? ''}`,
    `会社規模: ${args.companySize ?? ''}`,
    `業種: ${args.industry ?? ''}`,
    `診断ID: ${args.resultId ?? ''}`,
    args.message ? `メッセージ: ${args.message}` : '',
  ].filter(Boolean);

  const text = lines.join('\n');
  const html = `<div>${lines
    .map((l) => l.replace(/&/g, '&amp;').replace(/</g, '&lt;'))
    .join('<br/>')}</div>`;

  return { subject, text, html };
}

/* ========== 互換：過去コードで使っていた可能性のある名前 ========== */
// 旧コードが期待しているエクスポート名に合わせたラッパー
export function buildConsultEmail(args: {
  name: string;
  consultant?: Consultant;
  resultId?: string;
  email?: string;
}) {
  // 互換のため、ユーザー向け受付メールを返す（用途が近いケースが多い）
  return renderConsultIntakeMailToUser(args);
}
