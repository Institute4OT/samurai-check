// /app/api/mail-test/route.ts
export const runtime = 'nodejs';

import { NextResponse } from 'next/server';
import { buildReportEmail } from '@/lib/emailTemplates';
import { sendMail } from '@/lib/mailer';

export async function POST() {
  try {
    const to = process.env.MAIL_TO_TEST || 'proc.sachiko@gmail.com';
    const reportLink = (process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000') + '/report/dummy';

    const mail = buildReportEmail({
      userName: 'SACHIKOさん',
      samuraiType: '真田幸村型' as any,
      companySize: '11-50',
      reportLink,
      consultLink: process.env.NEXT_PUBLIC_CONSULT_URL,
      shareLink: process.env.NEXT_PUBLIC_SHARE_URL,
      openChatLink: process.env.NEXT_PUBLIC_OPENCHAT_URL,
      openChatQrSrc: process.env.NEXT_PUBLIC_OPENCHAT_QR,
      diagId: 'test-0000-0000',
    });

    await sendMail(to, mail.subject, mail.html, mail.text);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('mail-test error', e);
    return NextResponse.json({ ok: false, error: String(e?.message || e) }, { status: 500 });
  }
}
