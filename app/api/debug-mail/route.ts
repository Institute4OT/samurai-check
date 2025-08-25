// app/api/debug-mail/route.ts
import { NextResponse } from 'next/server';
import { sendMail } from '@/lib/mail';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

// Vercel に DEBUG_MAIL_KEY を設定して使う（無いと 403）
const KEY = process.env.DEBUG_MAIL_KEY;

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const key = searchParams.get('key') || '';
    if (!KEY || key !== KEY) {
      return NextResponse.json({ ok: false, error: 'forbidden' }, { status: 403 });
    }

    const to =
      searchParams.get('to') ||
      process.env.MAIL_TO_TEST ||
      process.env.MAIL_REPLY_TO ||
      'info@ourdx-mtg.com';

    const info = await sendMail({
      to,
      subject: '【debug】メール送信テスト',
      html: `<p>debug mail ok to: ${to}</p>`,
      text: `debug mail ok to: ${to}`,
    });

    return NextResponse.json({ ok: true, info });
  } catch (e: any) {
    console.error('[api/debug-mail] failed:', e);
    return NextResponse.json(
      { ok: false, error: e?.message || String(e) },
      { status: 500 }
    );
  }
}
