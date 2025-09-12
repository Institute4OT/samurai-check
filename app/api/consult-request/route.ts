// /app/api/consult-request/route.ts
// 相談受付 → ユーザー通知／社内通知／ご案内メール送信

import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { sendMail } from '@/lib/mail'; // ← 統一ポイント：ブリッジ経由で新 mailer を使う

import {
  buildConsultEmail,
  renderConsultIntakeMailToUser,
  renderConsultIntakeMailToOps,
} from '@/lib/emailTemplates';

// Next.js ルート設定
export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const preferredRegion = 'hnd1'; // Tokyo（お好みで）

// 入力ペイロード
const Payload = z.object({
  email: z.string().email(),
  name: z.string().min(1).optional(),
  company: z.string().optional(),
  note: z.string().optional(),
  rid: z.string().optional(), // ← 任意（計測や関連付けに使う）
  dry: z.boolean().optional(), // dry-run したい時は true
});

type Consultant = {
  name?: string;
  email: string;
  company?: string;
  note?: string;
};

// 計測用の UTM を付与（rid は utm_id に）
function addUtm(url: string, content: string, rid?: string) {
  try {
    const u = new URL(url);
    u.searchParams.set('utm_source', 'email');
    u.searchParams.set('utm_medium', 'transactional');
    u.searchParams.set('utm_campaign', 'consult_intake');
    u.searchParams.set('utm_content', content);
    if (rid) u.searchParams.set('utm_id', rid);
    return u.toString();
  } catch {
    return url;
  }
}

export async function POST(req: NextRequest) {
  try {
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

    const { email, name, company, note, rid, dry } = parsed.data;
    const input: Consultant = { email, name, company, note };

    // 相談導線（テンプレが対応していれば使われる想定）
    const bookingBase =
      process.env.NEXT_PUBLIC_BOOKING_URL?.trim() ||
      `${process.env.NEXT_PUBLIC_APP_URL?.trim() || ''}/consult`;
    const consultLink = bookingBase
      ? addUtm(
          rid ? `${bookingBase}${bookingBase.includes('?') ? '&' : '?'}rid=${encodeURIComponent(rid)}`
              : bookingBase,
          'cta_consult',
          rid
        )
      : '';

    // メール内容を生成
    const userMail = renderConsultIntakeMailToUser(input); // 相談受付（ユーザー向け）
    const opsMail  = renderConsultIntakeMailToOps(input);  // 相談受付（社内向け）
    // ご案内メール：テンプレ側が consultLink を受けられる場合に備え同梱（型は any で吸収）
    const guideMail = buildConsultEmail({ ...(input as any), consultLink } as any);

    // dry-run の時は送信スキップ
    if (!dry) {
      await Promise.all([
        sendMail({
          to: email,
          subject: userMail.subject,
          html: userMail.html,
          text: userMail.text,
          replyTo: process.env.MAIL_REPLY_TO || undefined,
          tagId: `consult:intake_user${rid ? `:${rid}` : ''}`,
        }),
        sendMail({
          to:
            process.env.MAIL_TO_OPS ||
            process.env.MAIL_TO_TEST ||
            email, // フォールバック
          subject: opsMail.subject,
          html: opsMail.html,
          text: opsMail.text,
          tagId: `consult:intake_ops${rid ? `:${rid}` : ''}`,
        }),
        sendMail({
          to: email,
          subject: guideMail.subject,
          html: guideMail.html,
          text: guideMail.text,
          replyTo: process.env.MAIL_REPLY_TO || undefined,
          tagId: `consult:guide${rid ? `:${rid}` : ''}`,
        }),
      ]);
    }

    return NextResponse.json({ ok: true, dry: !!dry });
  } catch (e: any) {
    console.error('[api/consult-request] error:', e);
    return NextResponse.json(
      { ok: false, error: e?.message ?? String(e) },
      { status: 400 }
    );
  }
}
