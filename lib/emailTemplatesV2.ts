// /lib/emailTemplatesV2.ts
// ============================================================
// 詳細レポート通知メール（V2）
// - 会社規模で文面と 2 本目の CTA を切り替え
//   * <= 50 : レポート + LINE OC を案内（シェアお願いを同封）
//   * 51+   : レポート + 無料個別相談を案内（特典）
// - UTM パラメータ付与、rid/email をリンクに埋め込み
// - 「このメールにそのまま返信OK」を明記
// - 2リンク原則（メインCTA + セグメントCTA）。LINE OC は両セグメントに案内（51+は本文末に小さめ）
// ============================================================

/** 返り値（emailTemplates.ts と同型） */
export type MailRender = { subject: string; html: string; text: string };

/** 呼び出し入力 */
export type ReportEmailV2Input = {
  rid?: string;                   // レポートID
  typeName?: string;              // 武将タイプ名（例: 真田幸村型）
  toName?: string;                // 宛名（例: SACHIKOさん）
  email?: string;                 // 受信者メール（rid と一緒にリンクへ付与）
  companySize?: string;           // “1-10” | “11-50” | “51-200” | “201-500” | “500+” など
  // リンクの明示指定（省略時は環境変数から生成）
  reportLink?: string;
  consultLink?: string;
  lineOcUrl?: string;
  // 件名の接頭辞（省略で 既定）
  titlePrefix?: string;           // 既定: 【武将タイプ診断】
};

// ====== 環境値とURLユーティリティ ======
const APP_BASE =
  (process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000').replace(/\/$/, '');
const BOOKING_BASE =
  (process.env.NEXT_PUBLIC_BOOKING_URL || `${APP_BASE}/consult`).replace(/\/$/, '');
const LINE_OC_URL =
  (process.env.NEXT_PUBLIC_LINE_OC_URL || '').trim();

/** rid/email をクエリへ足す（既にあれば上書きしない）+ UTM 付与 */
function withRidEmailUtm(url: string, rid?: string, email?: string, campaign?: string) {
  const u = new URL(url);
  if (rid && !u.searchParams.has('rid')) u.searchParams.set('rid', rid);
  if (email && !u.searchParams.has('email')) u.searchParams.set('email', email);
  if (campaign) {
    if (!u.searchParams.has('utm_source')) u.searchParams.set('utm_source', 'email');
    if (!u.searchParams.has('utm_medium')) u.searchParams.set('utm_medium', 'transactional');
    if (!u.searchParams.has('utm_campaign')) u.searchParams.set('utm_campaign', campaign);
  }
  return u.toString();
}

/** 会社規模の正規化（<=50 なら 'small'、それ以外 'large'） */
function sizeBucket(size?: string) {
  if (!size) return 'small';
  const s = String(size).toLowerCase();
  if (s.includes('1-10') || s.includes('11-50') || s.includes('1–10') || s.includes('11–50')) {
    return 'small';
  }
  // 数値だけの場合もざっくり判定
  const m = s.match(/\d+/g);
  if (m && Number(m[0]) <= 50) return 'small';
  return 'large';
}

/** 文章用のエスケープ薄めの整形 */
function esc(s: string) {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

// ====== 本体 ======
export function buildReportEmailV2(input: ReportEmailV2Input): MailRender {
  const rid = input.rid || 'unknown-id';
  const typeName = input.typeName || '（タイプ判定中）';
  const toName = input.toName || 'SACHIKOさん';
  const bucket = sizeBucket(input.companySize);

  // ベースリンク生成
  const reportUrl = withRidEmailUtm(
    input.reportLink || `${APP_BASE}/report/${encodeURIComponent(rid)}`,
    rid,
    input.email,
    'report_ready'
  );
  const consultUrl = withRidEmailUtm(
    input.consultLink || BOOKING_BASE,
    rid,
    input.email,
    'consult_cta'
  );
  const lineUrl = input.lineOcUrl
    ? withRidEmailUtm(input.lineOcUrl, rid, input.email, 'line_oc_cta')
    : (LINE_OC_URL ? withRidEmailUtm(LINE_OC_URL, rid, input.email, 'line_oc_cta') : '');

  const prefix = input.titlePrefix || '【武将タイプ診断】';
  const subject = `${prefix} ▶ ${typeName} ｜ ■詳細レポートのご案内（シェア歓迎） （ID: ${rid}）`;

  // セグメント別の塊
  const segSmall = `
    <p><strong>🌟 50名以下の組織の皆さまへ</strong><br/>
      診断アプリのご紹介・シェアにご協力ください（経営者仲間やSNSでの拡散をお願いします）。</p>
    ${lineUrl ? `
      <p style="margin:14px 0 0">
        <a href="${lineUrl}" style="display:inline-block;padding:10px 16px;border:1px solid #0b8f4d;border-radius:8px;text-decoration:none">
          LINEオープンチャットに参加する
        </a>
      </p>` : ''}
  `;

  const segLarge = `
    <p><strong>🌟 51名以上の組織の皆さまへ</strong><br/>
      詳細レポート特典として、<u>無料個別相談</u>をご案内しています。</p>
    <p style="margin:14px 0 0">
      <a href="${consultUrl}" style="display:inline-block;padding:10px 16px;border:1px solid #111;border-radius:8px;text-decoration:none">
        無料個別相談を申し込む
      </a>
    </p>
    ${lineUrl ? `<p style="font-size:12px;color:#555;margin-top:10px">※ 情報交換用の LINE オープンチャットも開設しています：
      <a href="${lineUrl}">参加リンク</a></p>` : ''}
  `;

  const html = `
    <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, 'Apple Color Emoji','Segoe UI Emoji'; line-height:1.7; color:#111;">
      <p>${esc(toName)}、こんにちは。IOT（企業の未来づくり研究所）です。</p>
      <p>診断の詳細レポートが整いました。以下よりご確認ください。</p>

      <p style="margin:18px 0;">
        <a href="${reportUrl}" style="display:inline-block;padding:12px 20px;background:#111;color:#fff;text-decoration:none;border-radius:8px;">
          ▶ レポートを開く
        </a>
      </p>

      <hr style="border:none;border-top:1px solid #eee;margin:20px 0;" />

      ${bucket === 'small' ? segSmall : segLarge}

      <hr style="border:none;border-top:1px solid #eee;margin:22px 0;" />

      <p>ご不明点があれば、このメールに<strong>そのまま返信</strong>してください。</p>

      <p style="font-size:12px;color:#555;margin-top:18px;">
        本メールは IOT（企業の未来づくり研究所）の診断サービスより自動送信されています。<br/>
        本件に心当たりがない場合はお手数ですが本メールへ返信ください。
      </p>

      <p style="font-size:12px;color:#555;">
        <a href="https://ourdx-mtg.com/" target="_blank" rel="noopener">一般社団法人 企業の未来づくり研究所</a>
      </p>
    </div>
  `.trim();

  const text =
    `${subject}\n\n` +
    `▼レポート: ${reportUrl}\n` +
    (bucket === 'small'
      ? (lineUrl ? `▼LINE OC: ${lineUrl}\n` : '') +
        `シェアのご協力をお願いします。`
      : `▼無料個別相談: ${consultUrl}\n` +
        (lineUrl ? `LINE OC: ${lineUrl}\n` : '')) +
    `\n\nご不明点はこのメールにそのまま返信してください。`;

  return { subject, html, text };
}

export default buildReportEmailV2;
