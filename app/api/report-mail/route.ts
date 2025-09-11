// app/api/report-mail/route.ts
/* eslint-disable no-console */
import { NextRequest, NextResponse } from 'next/server';
import { buildReportEmail } from '@/lib/emailTemplates';
import { sendMail } from '@/lib/mail';

// buildReportEmail の第1引数型をそのまま取得（テンプレ実装に追従）
type ReportEmailInput = Parameters<typeof buildReportEmail>[0];

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    // 受信ボディ（既存クライアントからのPOSTを想定）
    const data = (await req.json()) ?? {};

    // 既存実装に合わせた値の組み立て（無ければ既定値）
    const email: string = (data.email ?? '').toString();
    const toNameBase: string =
      (data.userName ?? data.toName ?? data.recipientName ?? email.split('@')[0] ?? '').toString();
    const toName = toNameBase || 'お客様';

    const samuraiType = data.samuraiType ?? data.type ?? 'unknown';
    const companySize = data.company_size ?? data.companySize ?? 'unknown';

    const reportLink: string =
      data.reportLink ??
      data.reportUrl ??
      (typeof location === 'object' ? `${location.origin}/report` : 'https://example.com/report');

    const consultLink: string =
      data.consultLink ??
      data.bookingUrl ??
      (typeof location === 'object' ? `${location.origin}/consult` : 'https://example.com/consult');

    // オプション（存在すれば流す）
    const shareLink = data.shareLink;
    const openChatLink = data.openChatLink;
    const openChatQrSrc = data.openChatQrSrc;
    const diagId = data.diagId;

    /**
     * ★型アダプタ：
     * - テンプレ側が期待するキー名が環境により異なることがあるため
     *   （toName / userName / recipientName など）を**同梱**
     * - その上で ReportEmailInput にキャストして型エラーを回避
     */
    const input = {
      // 名前系は“同義キー”を全部入れてテンプレ側どれでも拾えるようにする
      toName,
      userName: toName,
      recipientName: toName,

      // 主要フィールド
      samuraiType,
      companySize,
      reportLink,
      consultLink,

      // 追加でテンプレが参照するかもしれない任意項目
      shareLink,
      openChatLink,
      openChatQrSrc,
      diagId,
    } as unknown as ReportEmailInput;

    // メール本文生成
    const mail = buildReportEmail(input);

    // 送信先：ユーザー or フォールバック
    const to = (email || process.env.MAIL_TO_TRS || '').toString().trim();
    if (to) {
      await sendMail({
        to,
        subject: mail.subject,
        html: mail.html,
        text: mail.text,
      });
    }

    return NextResponse.json({
      ok: true,
      to,
      subject: mail.subject,
      htmlPreviewBytes: Buffer.byteLength(mail.html, 'utf8'),
    });
  } catch (err: any) {
    console.error('[api/report-mail] error:', err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? String(err) },
      { status: 400 }
    );
  }
}
