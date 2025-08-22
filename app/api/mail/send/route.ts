import { NextResponse } from 'next/server';
import { sendMail } from '@/lib/mail';
import { buildConsultEmail } from '@/lib/emailTemplates';

type Body = {
  to: string;
  toName?: string;
  downloadUrl: string; // ここにPDFのURL（トークン付き）を渡す
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;

    if (!body?.to || !body?.downloadUrl) {
      return NextResponse.json({ ok: false, error: 'Missing params' }, { status: 400 });
    }

    // 簡易バリデーション
    if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(body.to)) {
      return NextResponse.json({ ok: false, error: 'Invalid email' }, { status: 400 });
    }

    const tpl = buildConsultEmail({
      toName: body.toName,
      downloadUrl: body.downloadUrl,
    });

    await sendMail({
      to: body.to,
      subject: tpl.subject,
      html: tpl.html,
      text: tpl.text,
    });

    return NextResponse.json({ ok: true });
  } catch (err: any) {
    console.error('MAIL_ERROR:', err);
    return NextResponse.json({ ok: false, error: 'MAIL_SEND_FAILED' }, { status: 500 });
  }
}
