// /app/api/report-mail/route.ts
export const runtime = 'nodejs'; // ResendはNodeランタイム推奨

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

// ★ 相対パスに変更（route.ts からプロジェクト直下の lib/ へ上がる）
import { buildReportEmail } from '../../../lib/emailTemplates';
import { sendMail } from '../../../lib/mailer';

// 受け取りボディ: { diagId: string }
const BodySchema = z.object({
  diagId: z.string().uuid(),
});

export async function POST(req: Request) {
  // 1) 入力パース
  const body = await req.json().catch(() => ({}));
  const parsed = BodySchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'Bad Request' }, { status: 400 });
  }
  const { diagId } = parsed.data;

  // 2) Supabase から診断レコードを取得
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  // テーブル名は "diagnoses" 想定（違う場合はここを変更）
  const { data, error } = await supabase
    .from('diagnoses')
    .select('id, email, company_size, samurai_type, normalized_scores')
    .eq('id', diagId)
    .limit(1)
    .maybeSingle();

  if (error || !data || !data.email) {
    console.error('supabase error:', error);
    return NextResponse.json({ ok: false, error: 'Not Found' }, { status: 404 });
  }

  // 3) レポートURLなどを組み立て
  const base = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';
  const reportLink = `${base}/report/${data.id}`;

  // 4) メール本文を生成
  const mail = buildReportEmail({
    userName: data.email.split('@')[0],
    samuraiType: data.samurai_type || undefined,
    companySize: data.company_size || 'unknown',
    reportLink,
    consultLink: process.env.NEXT_PUBLIC_CONSULT_URL,
    shareLink: process.env.NEXT_PUBLIC_SHARE_URL,
    openChatLink: process.env.NEXT_PUBLIC_OPENCHAT_URL,
    openChatQrSrc: process.env.NEXT_PUBLIC_OPENCHAT_QR,
    diagId: data.id,
  });

  // 5) 送信
  await sendMail(data.email, mail.subject, mail.html, mail.text);

  return NextResponse.json({ ok: true });
}
