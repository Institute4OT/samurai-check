// app/api/mail/send/route.ts

import { NextResponse } from 'next/server';
import { sendReportMail } from '@/lib/mail';
import { buildReportEmailV2 } from '@/lib/emailTemplates'; // ✅ 追加

export async function POST(req: Request) {
  try {
    const { to, name, uuid, samuraiType, email, companySize } = await req.json(); // ✅ 追加

    if (!to || !uuid) {
      return NextResponse.json({ ok: false, error: 'Missing params' }, { status: 400 });
    }

    const { subject, html, text } = buildReportEmailV2({
      rid: uuid,
      typeName: samuraiType,
      toName: name,
      email,
      companySize,
    });

    await sendReportMail({
      to: email,
      subject,
      html,
      text,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('MAIL_SEND_FAILED', err);
    return NextResponse.json({ ok: false, error: 'MAIL_SEND_FAILED' }, { status: 500 });
  }
}
