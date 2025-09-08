// lib/emailTemplates.ts
// ─ メール本文テンプレ & URLユーティリティ（後方互換を全部カバー）─

/* ======================= 基本設定 ======================= */

const BRAND = 'IOT（企業の未来づくり研究所）';

// App URL（末尾スラ無し）
export const APP_URL = (
  process.env.NEXT_PUBLIC_APP_URL ||
  (process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'http://localhost:3000')
).replace(/\/+$/, '');

// 共有用（トップ）URL
const SHARE_URL = APP_URL;

// LINE OC
const LINE_OC_URL = (process.env.NEXT_PUBLIC_LINE_OC_URL || '').trim();

/* ======================= URL ビルド ======================= */

// レポートURL（新: rid、旧: resultId も付けて互換維持）
export const REPORT_URL = (id: string) => {
  const u = new URL(`${APP_URL}/report`);
  u.searchParams.set('rid', id);
  // 旧互換（念のため両方）
  u.searchParams.set('resultId', id);
  return u.toString();
};
export const reportUrl = REPORT_URL; // 互換エイリアス

// 相談予約URL（Spir 直 or 自社フォーム）
const SPIR_ISHIJIMA = process.env.SPIR_ISHIJIMA_URL?.trim();
const SPIR_MORIGAMI  = process.env.SPIR_MORIGAMI_URL?.trim();

export type Consultant = 'ishijima' | 'morigami' | undefined;

export const bookingUrlFor = (
  c?: Consultant,
  resultId?: string,   // 旧名
  email?: string
) => {
  const base =
    c === 'morigami' ? (SPIR_MORIGAMI || `${APP_URL}/consult/start`) :
    c === 'ishijima' ? (SPIR_ISHIJIMA || `${APP_URL}/consult/start`) :
    `${APP_URL}/consult/start`;

  const params = new URLSearchParams();
  if (resultId) {
    // 新：rid、旧：resultId の両方を付与（どちらでも拾えるように）
    params.set('rid', resultId);
    params.set('resultId', resultId);
  }
  if (email) params.set('email', email);

  const qs = params.toString();
  return qs ? `${base}${base.includes('?') ? '&' : '?'}${qs}` : base;
};

/* ======================= 署名 ======================= */

const signatureText = `
━━━━━━━━━━━━━━━━━━
一般社団法人 企業の未来づくり研究所
(Institute for Our Transformation)
https://ourdx-mtg.com/
お問合せ：info@ourdx-mtg.com
〒150-0001 東京都渋谷区神宮前6-29-4 原宿小宮ビル6F
`.trim();

const signatureHTML = `
<hr style="border:none;border-top:1px solid #eee;margin:20px 0" />
<p style="font-size:12px;color:#666;line-height:1.6;">
  一般社団法人 企業の未来づくり研究所<br/>
  (Institute for Our Transformation)<br/>
  <a href="https://ourdx-mtg.com/" target="_blank" rel="noopener">https://ourdx-mtg.com/</a><br/>
  お問合せ：<a href="mailto:info@ourdx-mtg.com">info@ourdx-mtg.com</a><br/>
  〒150-0001 東京都渋谷区神宮前6-29-4 原宿小宮ビル6F
</p>
`.trim();

/* ======================= 型 ======================= */

// 旧英数字表記
export type CompanySize =
  | '1-10' | '11-50' | '51-100' | '101-300' | '301-500' | '501-1000' | '1001+';

// 日本語表記も来るので両対応で判定
const LARGE_SIZES_JA = new Set([
  '51〜100名', '51～100名',
  '101〜300名', '101～300名',
  '301〜1000名', '301～1000名',
  '1001名以上', '1001 名以上', '1000名以上', '1000 名以上',
]);
const SMALL_SIZES_JA = new Set(['1〜10名', '1～10名', '11〜50名', '11～50名']);

// 51名以上か？
function isLarge(companySize: CompanySize | string | null | undefined) {
  if (!companySize) return true; // 不明なら安全側（特典表示OK側）に倒す or falseにしたいならここを変更
  const s = String(companySize).trim();
  if (LARGE_SIZES_JA.has(s)) return true;
  if (SMALL_SIZES_JA.has(s)) return false;
  // 旧英数字
  if (s === '1-10' || s === '11-50') return false;
  return true; // それ以外は 51名以上扱い
}

/* ================================================================
   1) 詳細レポート申込：ユーザー向け（会社規模で文面分岐）
   ================================================================ */

export function renderReportRequestMailToUser(args: {
  name: string;
  resultId?: string;              // rid 同義
  companySize: CompanySize | string; // 寛容化（日本語表記も可）
  consultant?: Consultant;
  email?: string;
}) {
  const _rid = args.resultId;
  const rUrl = _rid ? REPORT_URL(_rid) : undefined;
  const bUrl = bookingUrlFor(args.consultant, _rid, args.email);

  if (isLarge(args.companySize)) {
    // 51名以上：特典あり
    const subject = '【武将タイプ診断アプリ特典】詳細レポートURLと特典のご案内';
    const text = `
${args.name} 様

AI時代の経営者「武将タイプ診断」をご利用いただきありがとうございます。
${rUrl ? `以下のURLから詳細レポートをご確認いただけます。\n\n▼レポート\n${rUrl}\n` : ''}

▼特典：無料個別相談（読み解き／次の一手／90日アクション案）
${bUrl}

※ 無料個別相談は、従業員51名以上の企業の経営者（もしくは役員相当の役職）の方への限定特典です。
このメールにご返信いただいてもOKです（返信先：info@ourdx-mtg.com）。

${signatureText}
    `.trim();

    const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;">
      <p>${args.name} 様</p>
      <p>AI時代の経営者「武将タイプ診断」をご利用いただきありがとうございます。</p>
      ${rUrl ? `<p>▼レポート<br/><a href="${rUrl}" target="_blank" rel="noopener">${rUrl}</a></p>` : ''}
      <p>▼<strong>特典：無料個別相談</strong>（読み解き／次の一手／90日アクション案）<br/>
        <a href="${bUrl}" target="_blank" rel="noopener">まずは相談内容を送る</a>
      </p>
      <p style="font-size:12px;color:#444;">※ 無料個別相談は、従業員51名以上の企業の経営者（もしくは役員相当の役職）の方への限定特典です。</p>
      <p>このメールに直接ご返信いただいてもOKです（返信先：info@ourdx-mtg.com）。</p>
      ${signatureHTML}
    </div>
    `.trim();

    return { subject, text, html };
  }

  // 50名以下：拡散のお願い＋OC 案内
  const subject = '【受付】詳細レポートのご案内｜応援＆共有のお願い';
  const text = `
${args.name} 様

AI時代の経営者「武将タイプ診断」をご利用いただきありがとうございます。
${rUrl ? `以下のURLから詳細レポートをご確認いただけます。\n\n▼レポート\n${rUrl}\n` : ''}
小さな団体の取り組みです。価値を感じていただけたら、経営者仲間やSNSへ共有していただけると励みになります。

▼紹介用リンク
${SHARE_URL}
${LINE_OC_URL ? `\n最新情報や交流はLINEオープンチャットでどうぞ： ${LINE_OC_URL}\n` : ''}

${signatureText}
  `.trim();

  const html = `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;">
    <p>${args.name} 様</p>
    <p>AI時代の経営者「武将タイプ診断」をご利用いただきありがとうございます。</p>
    ${rUrl ? `<p>▼レポート<br/><a href="${rUrl}" target="_blank" rel="noopener">${rUrl}</a></p>` : ''}
    <p>価値を感じていただけたら、経営者仲間やSNSへ共有していただけると励みになります。</p>
    <p>▼紹介用リンク<br/><a href="${SHARE_URL}" target="_blank" rel="noopener">${SHARE_URL}</a></p>
    ${LINE_OC_URL ? `<p>最新情報や交流はLINEオープンチャットへ： <a href="${LINE_OC_URL}" target="_blank" rel="noopener">${LINE_OC_URL}</a></p>` : ''}
    ${signatureHTML}
  </div>
  `.trim();

  return { subject, text, html };
}

/* ================================================================
   2) 詳細レポート申込：運用向け通知
   ================================================================ */

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
  resultId?: string; // rid
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

/* ================================================================
   3) 相談申込：ユーザー向け 自動返信（互換）
   ================================================================ */

export function renderConsultIntakeMailToUser(args: {
  name: string;
  consultant?: Consultant;
  resultId?: string;
  email?: string;
}) {
  const bUrl = bookingUrlFor(args.consultant, args.resultId, args.email);
  const rUrl  = args.resultId ? REPORT_URL(args.resultId) : undefined;

  const subject = '【武将タイプ診断アプリ特典】無料個別相談のご案内（受付完了）';
  const text = `
${args.name} 様

AI時代の経営者「武将タイプ診断」への無料個別相談のお申込み、ありがとうございます。
下記の予約リンクからご都合の良い日時をご選択ください。

予約リンク：
${bUrl}
${rUrl ? `\n参考：診断レポート\n${rUrl}\n` : ''}

※ 無料個別相談は、詳細レポートのお申込みをいただいた従業員51名以上の企業の経営者（もしくは役員相当の役職）の方への限定特典です。

${signatureText}
`.trim();

  const html = `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;">
    <p>${args.name} 様</p>
    <p>AI時代の経営者「武将タイプ診断」への無料個別相談のお申込み、ありがとうございます。<br/>
       下記の予約リンクからご都合の良い日時をご選択ください。</p>
    <p><a href="${bUrl}" target="_blank" rel="noopener">予約ページを開く</a></p>
    ${rUrl ? `<p>参考：レポート <a href="${rUrl}" target="_blank" rel="noopener">${rUrl}</a></p>` : ''}
    <p style="font-size:12px;color:#444;">※ 無料個別相談は、詳細レポートのお申込みをいただいた従業員51名以上の企業の経営者（もしくは役員相当の役職）の方への限定特典です。</p>
    ${signatureHTML}
  </div>
  `.trim();

  return { subject, text, html };
}

/* ================================================================
   4) 相談申込：運用向け通知（互換）
   ================================================================ */

export function renderConsultIntakeMailToOps(args: {
  name?: string;
  email?: string;
  tel?: string; // 互換用（現フォームは未入力想定）
  companyName?: string;
  companySize?: CompanySize | string;
  industry?: string;
  resultId?: string;
  message?: string;
  consultant?: Consultant; // 受け取れても未使用でOK
}) {
  const subject = '【通知】無料相談の新規申込みがありました';

  const esc = (s: string) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;');
  const line = (label: string, v: unknown) =>
    v && String(v).trim() ? `${label}: ${String(v).trim()}` : '';

  const lines = [
    line('氏名', args.name),
    line('メール', args.email),
    line('電話', args.tel),                 // ← 未入力なら行ごと出さない
    line('会社名', args.companyName),
    line('会社規模', args.companySize),
    line('業種', args.industry),
    line('診断ID', args.resultId),
    line('担当候補', args.consultant),
    line('メッセージ', args.message),
  ].filter(Boolean) as string[];

  const text = lines.join('\n');
  const html = `<div>${lines.map((l) => esc(l)).join('<br/>')}</div>`;

  return { subject, text, html };
}

/* ================================================================
   5) 互換API：buildConsultEmail
   ================================================================ */

type BuildV1 = { name: string; consultant?: Consultant; resultId?: string; email?: string; };
type BuildV2 = { toName: string; reportUrl: string; bookingUrl: string; offerNote?: string; };

export function buildConsultEmail(args: BuildV1 | BuildV2) {
  if ('toName' in args) {
    // 旧Bパターン
    const subject = '【受付】詳細レポートのご案内';
    const text = `
${args.toName} 様

詳細レポートはこちらからご確認いただけます。
▼レポート
${args.reportUrl}

▼無料個別相談（任意）
${args.bookingUrl}
${args.offerNote ? `\n※${args.offerNote}` : ''}

${signatureText}
`.trim();

    const html = `
    <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial;">
      <p>${args.toName} 様</p>
      <p>詳細レポートはこちらからご確認いただけます。</p>
      <p>▼レポート<br/><a href="${args.reportUrl}" target="_blank" rel="noopener">${args.reportUrl}</a></p>
      <p>▼無料個別相談（任意）<br/><a href="${args.bookingUrl}" target="_blank" rel="noopener">${args.bookingUrl}</a></p>
      ${args.offerNote ? `<p style="color:#444;">※${args.offerNote}</p>` : ''}
      ${signatureHTML}
    </div>
    `.trim();

    return { subject, text, html };
  }

  // 旧Aパターン → 相談自動返信をそのまま返す
  return renderConsultIntakeMailToUser(args);
}
