// lib/emailTemplates.ts
// 既存：詳細レポ申込者向け（レポートURL + 申込者限定の無料相談を案内）
export function buildConsultEmail(params: {
  toName?: string;
  reportUrl: string;
  bookingUrl: string;
  lineUrl?: string;
  offerNote?: string;
}) {
  const {
    toName,
    reportUrl,
    bookingUrl,
    lineUrl = "https://x.gd/9RRcN",
    offerNote = "申込者限定・今月枠あり",
  } = params;

  const greeting = toName ? `${toName} 様` : "ご担当者様";
  const subject = `【AI診断】詳細レポートのご案内（受付完了）｜${offerNote} 無料個別相談`;

  const signatureText = `
一般社団法人 企業の未来づくり研究所（Institute for Our Transformation）
https://ourdx-mtg.com/
お問合せ先：info@ourdx-mtg.com
〒150-0001 東京都渋谷区神宮前6-29-4 原宿小宮ビル6F
`.trim();

  const text = `
${greeting}

詳細レポートのお申込み、ありがとうございます。
下記URLから内容をご確認いただけます。

▼レポート確認
${reportUrl}

▼【特典】無料個別相談（${offerNote}）
結果の読み解き／次の一手／90日アクション案まで一緒に詰めます。
※申込者限定の特典です。今月枠の空きがあるうちにご予約ください。
予約フォーム：
${bookingUrl}

―― 補足（情報配信）
IOTの研修・組織開発に関する最新情報は、LINEオープンチャットで発信しています。
https://x.gd/9RRcN
※1:1のやり取りはできません／予約は不可です。ご相談は上記フォームから。

このメールへ直接ご返信いただいてもOKです（返信先：info@ourdx-mtg.com）。

${signatureText}
`.trim();

  const button = (href: string, label: string) => `
    <a href="${href}" target="_blank" rel="noopener"
       style="
         display:inline-block;padding:12px 18px;margin:6px 0;
         background:#0ea5e9;color:#fff !important;text-decoration:none;
         border-radius:8px;font-weight:600;
       ">${label}</a>`.trim();

  const html = `
  <p>${greeting}</p>
  <p>詳細レポートのお申込み、ありがとうございます。<br>
     下記より内容をご確認ください。</p>

  <h3 style="margin:14px 0 6px;">▼レポート確認</h3>
  <p>${button(reportUrl, "レポートを開く")}</p>
  <p style="margin:6px 0;color:#374151;font-size:14px;">URL：<a href="${reportUrl}" target="_blank" rel="noopener">${reportUrl}</a></p>

  <hr style="margin:18px 0;border:none;border-top:1px solid #e5e7eb;">

  <h3 style="margin:14px 0 6px;">▼【特典】無料個別相談（${offerNote}）</h3>
  <ul style="margin:0 0 10px 18px;color:#374151;font-size:14px;line-height:1.6;">
    <li>結果の読み解き</li>
    <li>次の一手の設計</li>
    <li>90日アクション案（3つの打ち手＋計測指標）</li>
  </ul>
  <p style="margin:6px 0 0;color:#ef4444;font-size:13px;">※申込者限定の特典です。今月枠の空きがあるうちにご予約ください。</p>
  <p>${button(bookingUrl, "無料個別相談を予約する")}</p>
  <p style="margin:6px 0;color:#374151;font-size:14px;">予約フォーム：<a href="${bookingUrl}" target="_blank" rel="noopener">${bookingUrl}</a></p>

  <hr style="margin:18px 0;border:none;border-top:1px solid #e5e7eb;">

  <h3 style="margin:14px 0 6px;">▼最新情報の受け取り（任意）</h3>
  <p style="margin:6px 0;color:#374151;font-size:14px;">
    IOTの研修・組織開発に関する最新情報は、LINEオープンチャットで発信しています。<br>
    <a href="https://x.gd/9RRcN" target="_blank" rel="noopener">https://x.gd/9RRcN</a><br>
    <small>※1:1のやり取りはできません／予約は不可です。ご相談は予約フォームをご利用ください。</small>
  </p>

  <p style="margin:16px 0 0;color:#374151;font-size:14px;">
    このメールに直接ご返信いただいてもOKです（返信先：<a href="mailto:info@ourdx-mtg.com">info@ourdx-mtg.com</a>）。</p>

  <hr style="margin:18px 0;border:none;border-top:1px solid #e5e7eb;">
  <p style="color:#374151;font-size:13px;line-height:1.6;">
    一般社団法人 企業の未来づくり研究所（Institute for Our Transformation）<br>
    <a href="https://ourdx-mtg.com/" target="_blank" rel="noopener">https://ourdx-mtg.com/</a><br>
    お問合せ先：<a href="mailto:info@ourdx-mtg.com">info@ourdx-mtg.com</a><br>
    〒150-0001 東京都渋谷区神宮前6-29-4 原宿小宮ビル6F
  </p>
  `.trim();

  return { subject, text, html };
}

// ===== 受付メール：会社規模で分岐 =====
const BRAND = 'IOT（企業の未来づくり研究所）';
const SITE =
  process.env.NEXT_PUBLIC_SITE_URL?.replace(/\/$/, '') ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000');

const BOOKING_URL =
  process.env.NEXT_PUBLIC_BOOKING_URL?.trim() || `${SITE}/consult`;

const SHARE_URL =
  process.env.NEXT_PUBLIC_SHARE_URL?.trim() || SITE;

type CompanySize =
  | '1-10' | '11-50' | '51-100' | '101-300' | '301-500' | '501-1000' | '1001+';

/** 申込者向け：受付完了（≤50はアンバサダー、≥51は無料相談案内） */
export function renderReportRequestMailToUser(args: {
  name: string;
  resultId?: string;
  companySize: CompanySize;
}) {
  const isLarge = !['1-10', '11-50'].includes(args.companySize);
  const reportUrl = args.resultId
    ? `${SITE}/report?resultId=${encodeURIComponent(args.resultId)}`
    : undefined;

  if (isLarge) {
    // 51名以上：無料相談の案内を同梱
    const subject = '【受付】詳細レポート＋無料個別相談のご案内';
    const text = `
${args.name} 様

詳細レポートのお申込みを受け付けました。
担当よりご連絡差し上げます。

${reportUrl ? `▼レポート確認\n${reportUrl}\n` : ''}▼無料個別相談（読み解き／次の一手／90日アクション案）
${BOOKING_URL}

このメールに直接ご返信いただいてもOKです（返信先：info@ourdx-mtg.com）。

${BRAND}
https://ourdx-mtg.com/
`.trim();

    const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;">
      <p>${args.name} 様</p>
      <p>詳細レポートのお申込みを受け付けました。担当よりご連絡差し上げます。</p>
      ${reportUrl ? `<p>▼レポート確認<br/><a href="${reportUrl}" target="_blank" rel="noopener">${reportUrl}</a></p>` : ''}
      <p>▼無料個別相談（読み解き／次の一手／90日アクション案）<br/>
        <a href="${BOOKING_URL}" target="_blank" rel="noopener">${BOOKING_URL}</a>
      </p>
      <p>このメールにご返信いただいてもOKです（返信先：info@ourdx-mtg.com）。</p>
      <hr style="border:none;border-top:1px solid #eee;margin:20px 0" />
      <p style="font-size:12px;color:#666;">${BRAND}<br/><a href="https://ourdx-mtg.com/">https://ourdx-mtg.com/</a></p>
    </div>
    `.trim();

    return { subject, text, html };
  }

  // 50名以下：アンバサダー（拡散のお願い）
  const subject = '【受付】詳細レポート準備中｜ご協力のお願い';
  const text = `
${args.name} 様

詳細レポートのお申込みを受け付けました。
${reportUrl ? `▼レポート確認\n${reportUrl}\n` : ''}　
小さな団体の取り組みです。もし価値があれば、経営者仲間へ共有いただけると嬉しいです。

▼紹介用リンク
${SHARE_URL}

ひとこと応援コメントも大歓迎です。このメールにご返信いただいてもOKです。

${BRAND}
https://ourdx-mtg.com/
`.trim();

  const html = `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;">
    <p>${args.name} 様</p>
    <p>詳細レポートのお申込みを受け付けました。</p>
    ${reportUrl ? `<p>▼レポート確認<br/><a href="${reportUrl}" target="_blank" rel="noopener">${reportUrl}</a></p>` : ''}
    <p>小さな団体の取り組みです。価値を感じていただけたら、経営者仲間へ共有いただけると励みになります。</p>
    <p>▼紹介用リンク<br/><a href="${SHARE_URL}" target="_blank" rel="noopener">${SHARE_URL}</a></p>
    <p>ひとこと応援コメントも大歓迎です（このメールにご返信ください）。</p>
    <hr style="border:none;border-top:1px solid #eee;margin:20px 0" />
    <p style="font-size:12px;color:#666;">${BRAND}<br/><a href="https://ourdx-mtg.com/">https://ourdx-mtg.com/</a></p>
  </div>
  `.trim();

  return { subject, text, html };
}

/** 運用(IOT)向け：申込内容通知 */
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
