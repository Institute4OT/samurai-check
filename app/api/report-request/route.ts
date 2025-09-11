// app/api/report-request/route.ts
/* eslint-disable no-console */
import { NextRequest, NextResponse } from 'next/server';
import { buildReportEmail } from '@/lib/emailTemplates';
import { sendMail } from '@/lib/mail';

type ReportEmailInput = Parameters<typeof buildReportEmail>[0];

export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  try {
    const data = (await req.json()) ?? {};

    // 基本情報
    const email: string = (data.email ?? '').toString();
    const toNameBase: string =
      (data.userName ?? data.toName ?? data.recipientName ?? email.split('@')[0] ?? '').toString();
    const toName = toNameBase || 'お客様';

    // タイプ／会社規模（既存のキー名ゆらぎを吸収）
    const samuraiType: string =
      (data.samuraiType ?? data.samurai_type ?? data.type ?? 'unknown').toString();
    const companySize: string =
      (data.companySize ?? data.company_size ?? 'unknown').toString();

    // 各URL（無ければフォールバック）
    const reportLink: string =
      (data.reportLink ?? data.reportUrl ?? '').toString() ||
      'https://example.com/report';
    const consultLink: string =
      (data.consultLink ?? data.bookingUrl ?? '').toString() ||
      'https://example.com/consult';

    // 任意パラメータ（存在すればテンプレに渡す）
    const shareLink = data.shareLink;
    const openChatLink = data.openChatLink;
    const openChatQrSrc = data.openChatQrSrc;
    const utm = data.utm;
    const diagId = data.diagId;

    // ★型アダプタ：テンプレの“1引数”に合わせ、名前系は同義キーを同梱
    const input = {
      toName,
      userName: toName,
      recipientName: toName,

      samuraiType,
      companySize,
      reportLink,
      consultLink,

      // 追加メタ
      shareLink,
      openChatLink,
      openChatQrSrc,
      utm,
      diagId,
    } as unknown as ReportEmailInput;

    const mail = buildReportEmail(input);

    // 送信（宛先が無い場合はフォールバック宛）
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
    console.error('[api/report-request] error:', err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? String(err) },
      { status: 400 }
    );
  }
}
