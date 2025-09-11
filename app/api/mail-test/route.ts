// app/api/mail-test/route.ts
import { NextRequest, NextResponse } from 'next/server';
import { buildReportEmail } from '@/lib/emailTemplates';

// 型アダプタ：buildReportEmail の第1引数型を取得
type ReportEmailInput = Parameters<typeof buildReportEmail>[0];

export async function GET(_req: NextRequest) {
  // ダミーデータ（実値に置換OK）
  const toName = 'SACHIKOさん';
  const samuraiType = '真田幸村型';
  const companySize = '11-50';
  const reportLink = 'https://example.com/report?rid=dummy';
  const consultLink = 'https://example.com/consult?rid=dummy';

  // ★キー名の差異を吸収するアダプタ
  //   - toName / userName / recipientName のいずれをテンプレが見ても値が入るように同梱
  //   - その上で ReportEmailInput にキャストして型エラーを解消
  const input = {
    // 名前の同義キーを全部入れる（テンプレ側が参照するものが当たる）
    toName,
    userName: toName,
    recipientName: toName,

    // そのほかのフィールド
    samuraiType,
    companySize,
    reportLink,
    consultLink,
  } as unknown as ReportEmailInput;

  const mail = buildReportEmail(input);

  // 送信はせず、テンプレ生成確認だけ返す
  return NextResponse.json({
    ok: true,
    subject: mail.subject,
    htmlPreviewBytes: Buffer.byteLength(mail.html, 'utf8'),
  });
}
