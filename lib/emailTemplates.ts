// lib/emailTemplates.ts
// ─ メール本文テンプレ & URLユーティリティ（互換APIを全部カバー）─

const BRAND = 'IOT（企業の未来づくり研究所）';

// ===== App URL（末尾スラ無し）=====
export const APP_URL = (
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
).replace(/\/+$/, '');

// ===== レポートURL =====
export const REPORT_URL = (id: string) =>
  `${APP_URL}/report?resultId=${encodeURIComponent(id)}`;
export const reportUrl = REPORT_URL; // エイリアス（互換のため）

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

const SHARE_URL = APP_URL;

// ===== 型 =====
export type CompanySize =
  | '1-10' | '11-50' | '51-100' | '101-300' | '301-500' | '501-1000' | '1001+';

// ===== 申込者向け（会社規模で文面分岐）=====
export function renderReportRequestMailToUser(args: {
  name: string;
  resultId?: string;
  companySize: CompanySize | string; // 寛容化
  consultant?: Consultant;
  email?: string;
}) {
  const isLarge = !['1-10', '11-50'].includes(String(args.companySize));
  const rUrl = args.resultId ? REPORT_URL(args.resultId) : undefined;
  const bUrl = bookingUrlFor(args.consultant, args.resultId, args.email);

  if (isLarge) {
    const subject = '【受付】詳細レポート＋無料個別相談のご案内';
    const text = `
${args.name} 様

詳細レポートのお申込みありがとうございます。
${rUrl ? `下記URLから今すぐご確認いただけます。\n\n▼レポート確認\n${rUrl}\n` : ''}

▼無料個別相談（読み解き／次の一手／90日アクション案）
${bUrl}

このメールに直接ご返信いただいてもOKです（返信先：info@ourdx-mtg.com）。
${BRAND}
https://ourdx-mtg.com/
    `.trim();

    const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;">
      <p>${args.name} 様</p>
      <p>詳細レポートのお申込みありがとうございます。</p>
      ${rUrl ? `<p>▼レポート確認<br/><a href="${rUrl}" target="_blank" rel="noopener">${rUrl}</a></p>` : ''}
      <p>▼無料個別相談（読み解き／次の一手／90日アクション案）<br/>
        <a href="${bUrl}" target="_blank" rel="noopener">${bUrl}</a>
      </p>
      <p>このメールに直接ご返信いただいてもOKです（返信先：info@ourdx-mtg.com）。</p>
      <hr style="border:none;border-top:1px solid #eee;margin:20px 0" />
      <p style="font-size:12px;color:#666;">${BRAND}<br/><a href="https://ourdx-mtg.com/">https://ourdx-mtg.com/</a></p>
    </div>
    `.trim();

    return { subject, text, html };
  }

  const subject = '【受付】詳細レポート準備中｜ご協力のお願い';
  const text = `
${args.name} 様

詳細レポートのお申込みありがとうございます。
${rUrl ? `下記URLから今すぐご確認いただけます。\n\n▼レポート確認\n${rUrl}\n` : ''}
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
    ${rUrl ? `<p>▼レポート確認<br/><a href="${rUrl}" target="_blank" rel="noopener">${rUrl}</a></p>` : ''}
    <p>価値を感じていただけたら、経営者仲間へ共有いただけると励みになります。</p>
    <p>▼紹介用リンク<br/><a href="${SHARE_URL}" target="_blank" rel="noopener">${SHARE_URL}</a></p>
    <p>ひとこと応援コメントも大歓迎です（このメールにご返信ください）。</p>
    <hr style="border:none;border-top:1px solid #eee;margin:20px 0" />
    <p style="font-size:12px;color:#666;">${BRAND}<br/><a href="https://ourdx-mtg.com/">https://ourdx-mtg.com/</a></p>
  </div>
  `.trim();

  return { subject, text, html };
}

// ===== 運用向け（詳細レポ申込通知）=====
export function renderReportRequestMailToOps(args: {
  email: string;
  name: string;
  companyName?: string;
  companySize: CompanySize | string;
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

// ===== 相談申込：ユーザー向け 自動返信 =====
export function renderConsultIntakeMailToUser(args: {
  name: string;
  consultant?: Consultant;
  resultId?: string;
  email?: string;
}) {
  const bUrl = bookingUrlFor(args.consultant, args.resultId, args.email);
  const rUrl  = args.resultId ? REPORT_URL(args.resultId) : undefined;

  const subject = '【受付】無料個別相談のご案内（今すぐ予約OK）';
  const text = `
${args.name} 様

無料個別相談のお申込みありがとうございます。
下記の予約リンクからご都合の良い日時をご選択ください。

予約リンク：
${bUrl}
${rUrl ? `\n参考：診断レポート\n${rUrl}\n` : ''}`.trim();

  const html = `
  <p>${args.name} 様</p>
  <p>無料個別相談のお申込みありがとうございます。<br>
     下記の予約リンクからご都合の良い日時をご選択ください。</p>
  <p><a href="${bUrl}" target="_blank" rel="noopener">予約ページを開く</a></p>
  ${rUrl ? `<p>参考：レポート <a href="${rUrl}" target="_blank" rel="noopener">${rUrl}</a></p>` : ''}
  `.trim();

  return { subject, text, html };
}

// ===== 相談申込：運用向け通知（互換）=====
export function renderConsultIntakeMailToOps(args: {
  name?: string;
  email?: string;
  tel?: string;
  companyName?: string;
  companySize?: CompanySize | string;
  industry?: string;
  resultId?: string;
  message?: string;
  consultant?: Consultant; // 受け取れても未使用でOK
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
    args.consultant ? `担当候補: ${args.consultant}` : '',
    args.message ? `メッセージ: ${args.message}` : '',
  ].filter(Boolean);

  const text = lines.join('\n');
  const html = `<div>${lines
    .map((l) => l.replace(/&/g, '&amp;').replace(/</g, '&lt;'))
    .join('<br/>')}</div>`;

  return { subject, text, html };
}

/* ------------------------------------------------------------------
   互換API：buildConsultEmail
   - 旧A: buildConsultEmail({ name, consultant?, resultId?, email? })
         → 相談自動返信（ユーザー向け）を返す
   - 旧B: buildConsultEmail({ toName, reportUrl, bookingUrl, offerNote? })
         → 「レポート案内 + 予約URL」を返す
-------------------------------------------------------------------*/
type BuildV1 = { name: string; consultant?: Consultant; resultId?: string; email?: string; };
type BuildV2 = { toName: string; reportUrl: string; bookingUrl: string; offerNote?: string; };

export function buildConsultEmail(args: BuildV1 | BuildV2) {
  if ('toName' in args) {
    // 旧Bパターン
    const subject = '【受付】詳細レポートのご案内';
    const text = `
${args.toName} 様

詳細レポートをご確認いただけます。
▼レポート
${args.reportUrl}

▼無料個別相談（任意）
${args.bookingUrl}
${args.offerNote ? `\n※${args.offerNote}` : ''}

${BRAND}
`.trim();

    const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;">
      <p>${args.toName} 様</p>
      <p>詳細レポートをご確認いただけます。</p>
      <p>▼レポート<br/><a href="${args.reportUrl}" target="_blank" rel="noopener">${args.reportUrl}</a></p>
      <p>▼無料個別相談（任意）<br/><a href="${args.bookingUrl}" target="_blank" rel="noopener">${args.bookingUrl}</a></p>
      ${args.offerNote ? `<p style="color:#444;">※${args.offerNote}</p>` : ''}
      <hr style="border:none;border-top:1px solid #eee;margin:20px 0" />
      <p style="font-size:12px;color:#666;">${BRAND}</p>
    </div>
    `.trim();

    return { subject, text, html };
  }

  // 旧Aパターン → 相談自動返信をそのまま返す
  return renderConsultIntakeMailToUser(args);
}
