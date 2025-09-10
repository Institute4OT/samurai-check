// /lib/emailTemplates.tsx
// ============================================================
// メールテンプレート集（実装一体版）
//  - 互換APIもここで提供：過去コードの import を壊さない
//  - buildReportEmail をここに実装（デフォルトエクスポート）
// ============================================================

/** 共通：メールレンダリング結果 */
export type MailRender = {
  subject: string;
  html: string;
  text: string;
};

// ------------------------------------------------------------
// 基本URL（レポート画面のベース）
// ------------------------------------------------------------
export const REPORT_URL =
  process.env.NEXT_PUBLIC_BASE_URL
    ? `${process.env.NEXT_PUBLIC_BASE_URL}/report`
    : 'http://localhost:3000/report';

// ------------------------------------------------------------
// 予約URL（旧API名: bookingUrlFor）
// ------------------------------------------------------------
export function bookingUrlFor(email: string) {
  const base =
    process.env.NEXT_PUBLIC_BOOKING_URL || 'http://localhost:3000/consult';
  const u = new URL(base);
  if (email) u.searchParams.set('email', email);
  return u.toString();
}

// ------------------------------------------------------------
// 相談系（互換用）
// ------------------------------------------------------------
export type Consultant = {
  name?: string;
  email: string;
  company?: string;
  note?: string;
};

export function renderConsultIntakeMailToUser(input: Consultant): MailRender {
  const title = '【IOT】相談受付のご連絡';
  const html = `
    <p>${input.name ?? 'ご担当者さま'}、お問い合わせありがとうございます。</p>
    <p>IOT（企業の未来づくり研究所）が内容を確認し、折り返しご連絡いたします。</p>
    <p>ご入力メール：${input.email}</p>
  `.trim();
  return { subject: title, html, text: `${title}\n\n${html.replace(/<[^>]+>/g, '')}` };
}

export function renderConsultIntakeMailToOps(input: Consultant): MailRender {
  const title = '【IOT】相談受付（社内通知）';
  const html = `
    <p>相談受付がありました。</p>
    <ul>
      <li>お名前：${input.name ?? '-'}</li>
      <li>メール：${input.email}</li>
      <li>会社：${input.company ?? '-'}</li>
      <li>メモ：${input.note ?? '-'}</li>
    </ul>
  `.trim();
  return { subject: title, html, text: `${title}\n\n${html.replace(/<[^>]+>/g, '')}` };
}

export function buildConsultEmail(input: Consultant): MailRender {
  const subject = '【IOT】無料個別相談のご案内';
  const url = bookingUrlFor(input.email);
  const html = `
    <p>${input.name ?? 'ご担当者さま'}、無料個別相談のご案内です。</p>
    <p><a href="${url}">こちらのリンク</a>から日程をご予約ください。</p>
  `.trim();
  return { subject, html, text: `${subject}\n\n${url}` };
}

// ------------------------------------------------------------
// 詳細レポート（本丸）
//  ※ buildReportEmail は最低限の型＋安定実装。
//    レポート本文のデザインは、必要に応じてここで発展可。
// ------------------------------------------------------------
export type ReportEmailInput = {
  /** レポートID（rid） */
  id?: string;
  /** 武将タイプ名（例：真田幸村型） */
  typeName?: string;
  /** レポートURL（未指定なら REPORT_URL + /[id]） */
  reportUrl?: string;
  /** 受信者メール（任意：CTA生成などに使用） */
  email?: string;
  /** 件名プリフィックス調整など（任意） */
  titlePrefix?: string; // 既定: 【武将タイプ診断】
};

export function buildReportEmail(input: ReportEmailInput): MailRender {
  const rid = input.id ?? 'unknown-id';
  const typeName = input.typeName ?? '（タイプ判定中）';
  const prefix = input.titlePrefix ?? '【武将タイプ診断】';
  const url =
    input.reportUrl ??
    (rid && REPORT_URL ? `${REPORT_URL}/${encodeURIComponent(rid)}` : REPORT_URL);

  const subject = `${prefix} ▶ ${typeName} ｜ ■詳細レポートのご案内（シェア歓迎） （ID: ${rid}）`;

  const html = `
    <div style="font-family: system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, 'Apple Color Emoji','Segoe UI Emoji'; line-height:1.7; color:#111;">
      <p>${'SACHIKOさん' /* ここはAPI側で差し込んでOK */}、こんにちは。IOT（企業の未来づくり研究所）です。</p>
      <p>診断の詳細レポートが整いました。以下よりご確認ください。</p>

      <p style="margin:20px 0;">
        <a href="${url}" style="display:inline-block;padding:12px 20px;background:#111;color:#fff;text-decoration:none;border-radius:8px;">
          ▶ レポートを開く
        </a>
      </p>

      <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />

      <p><strong>🌟50名以下の経営者の皆さまへ</strong><br/>
      診断アプリのご紹介にご協力ください（経営者仲間やSNSでのシェア・拡散をお願いします）。</p>

      <p style="margin-top:12px;">
        <strong>🌟51名以上の経営者の皆さまへ</strong><br/>
        詳細レポート特典として、<u>無料個別相談</u>をご案内しています。
      </p>

      <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
      <p style="font-size:12px;color:#555;">
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
    `レポートURL: ${url}\n\n` +
    `50名以下の経営者の皆さまへ: 診断アプリのご紹介にご協力ください（経営者仲間やSNSでのシェア・拡散）。\n` +
    `51名以上の経営者の皆さまへ: 詳細レポート特典「無料個別相談」のご案内。`;

  return { subject, html, text };
}

// 互換性のための再エクスポート形式も提供（過去の import 先が同名でもOK）
export { buildReportEmail as _buildReportEmail };

// デフォルトは本丸
export default buildReportEmail;
