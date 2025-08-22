import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
// import nodemailer from 'nodemailer'; // Gmail通知を使う場合

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const { token, eventId, startAt, name, email } = await req.json();

  const { error } = await supabase
    .from('consult_intake')
    .update({
      status: 'booked',
      spir_event_id: eventId,
      spir_start_at: startAt,
      applicant_name: name,
      applicant_email: email,
    })
    .eq('token', token);

  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });

  // 任意：ourdx.mtg@gmail.com へ通知メール
  // const tx = nodemailer.createTransport({ host: process.env.SMTP_HOST!, port: Number(process.env.SMTP_PORT || 587), secure: false, auth: { user: process.env.SMTP_USER!, pass: process.env.SMTP_PASS! } });
  // await tx.sendMail({
  //   from: process.env.SMTP_USER!,
  //   to: 'ourdx.mtg@gmail.com',
  //   subject: `【予約確定】${name} / ${new Date(startAt).toLocaleString('ja-JP')}`,
  //   html: `<p>Token: ${token} / EventId: ${eventId}</p>`,
  // });

  return NextResponse.json({ ok: true });
}
