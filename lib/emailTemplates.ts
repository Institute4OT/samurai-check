// lib/emailTemplates.ts
// 詳細レポ申込者向け：レポートURL + 申込者限定の無料相談（今月枠あり）を強調

export function buildConsultEmail(params: {
  toName?: string;
  reportUrl: string;   // レポート確認URL（例: /report?resultId=...）
  bookingUrl: string;  // 無料相談予約フォームURL（例: /consult/start?token=...）
  lineUrl?: string;    // 情報配信用オープンチャット（1:1不可）
  offerNote?: string;  // 例: "申込者限定・今月枠あり" / "先着枠あり" など
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

  // ---- TEXT（プレーン） ----
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

  // ---- HTML（簡易ボタン付き） ----
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
    <a href="${lineUrl}" target="_blank" rel="noopener">${lineUrl}</a><br>
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
