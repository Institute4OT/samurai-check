// app/api/report-request/route.ts

import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { sendMail } from '@/lib/mail';
import buildReportEmailV2 from '@/lib/emailTemplatesV2';

// =================== Supabaseクライアント初期化 ===================

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

// =================== フォームデータのバリデーションスキーマ ===================

const FormDataSchema = z.object({
  name: z.string(),
  email: z.string().email(),
  companySize: z.string().nullable().optional(),
  industry: z.string().nullable().optional(),
  ageGroup: z.string().nullable().optional(),
  type: z.string(),              // 武将タイプ
  samuraiResultId: z.string(),  // Supabase ID
  consultant: z.string().nullable().optional(),
  consultReason: z.string().nullable().optional(),
});

// =================== メイン関数 ===================

export async function POST(req: Request) {
  const body = await req.json();
  const parsed = FormDataSchema.safeParse(body);

  if (!parsed.success) {
    console.error('❌ バリデーション失敗:', parsed.error.flatten());
    return NextResponse.json({ error: 'Invalid form data' }, { status: 400 });
  }

  const input = parsed.data;

  // 🔽 必要な変数に分解（PDFメール生成に使う）
  const {
    name,
    email,
    companySize,
    type: samuraiType,
    samuraiResultId: rid,
  } = input;

  // =================== メールテンプレート作成 ===================

  const { subject, html, text } = buildReportEmailV2({
    rid,
    typeName: samuraiType,
    toName: name,
    email,
     companySize: companySize ?? '',
  });

  // =================== Supabase 保存 ===================

  const { error } = await supabase.from('reportRequests').insert([input]);

  if (error) {
    console.error('❌ Supabase保存エラー:', error);
    return NextResponse.json({ error: 'Failed to save to database' }, { status: 500 });
  }

  // =================== メール送信 ===================

  try {
    await sendMail({
      to: email,
      subject,
      html,
      text,
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error('❌ メール送信エラー:', err);
    return NextResponse.json({ error: 'Failed to send email' }, { status: 500 });
  }
}
