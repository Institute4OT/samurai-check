// /app/api/consult-request/route.ts
// 相談受付 → ユーザー通知／社内通知／ご案内メール送信

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';

import {
  buildConsultEmail,
  renderConsultIntakeMailToUser,
  renderConsultIntakeMailToOps,
} from '@/lib/emailTemplates';
import sendMail from '@/lib/mailer';

// Next.js ルート設定
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const preferredRegion = 'hnd1'; // Tokyo（お好みで）

// 入力ペイロード
const Payload = z.object({
  email: z.string().email(),
  name: z.string().min(1).optional(),
  company: z.string().optional(), // ← UI側のキー名が company ならこれでOK
  note: z.string().optional(),
  dry: z.boolean().optional(), // dry-run したい時は true
});

type Consultant = {
  name?: string;
  email: string;
  company?: string;
  note?: string;
};

export async function POST(req: NextRequest) {
  // JSON 取得とバリデーション
  const json = await req.json().catch(() => null);
  if (!json) {
    return NextResponse.json({ ok: false, error: 'invalid json' }, { status: 400 });
  }
  const parsed = Payload.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.flatten() },
      { status: 400 }
    );
  }

  const { email, name, company, note, dry } = parsed.data;
  const input: Consultant = { email, name, company, note };

  // メール内容を生成
  const userMail = renderConsultIntakeMailToUser(input); // 相談受付（ユーザー向け）
  const opsMail = renderConsultIntakeMailToOps(input);   // 相談受付（社内向け）
  const guideMail = buildConsultEmail(input);            // 無料個別相談のご案内

  // dry-run の時は送信スキップ
  if (!dry) {
    await Promise.all([
      sendMail({ to: email, ...userMail }),
      sendMail({
        to:
          process.env.MAIL_TO_OPS ||
          process.env.MAIL_TO_TEST ||
          email, // フォールバック
        ...opsMail,
      }),
      sendMail({ to: email, ...guideMail }),
    ]);
  }

  return NextResponse.json({ ok: true, dry: !!dry });
}
