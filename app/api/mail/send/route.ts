// app/api/mail/send/route.ts

import { NextResponse } from 'next/server';
import { sendReportMail } from '@/lib/mail';

export async function POST(req: Request) {
  try {
    const { to, name, uuid } = await req.json();

    if (!to || !uuid) {
      return NextResponse.json({ ok: false, error: 'Missing params' }, { status: 400 });
    }

    await sendReportMail({
      to,
      name,
      uuid,
    });

    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error('MAIL_SEND_FAILED', err);
    return NextResponse.json({ ok: false, error: 'MAIL_SEND_FAILED' }, { status: 500 });
  }
}
