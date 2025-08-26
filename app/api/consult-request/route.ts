// app/api/consult-request/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { sendMail } from '@/lib/mail';
import {
  renderConsultIntakeMailToUser,
  renderConsultIntakeMailToOps,
  bookingUrlFor,
} from '@/lib/emailTemplates';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const preferredRegion = ['hnd1']; // Tokyo(羽田)

type Consultant = 'ishijima' | 'morigami';

const Payload = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  companyName: z.string().optional(),
  companySize: z.string().optional(),
  industry: z.string().optional(),
  resultId: z.string().optional(),
  // 任意の補助情報（自動振り分け用）
  themes: z.array(z.string()).optional(),
  style: z.array(z.string()).optional(),
  note: z.string().optional(),
  assigneePref: z.enum(['either', 'ishijima', 'morigami']).default('either'),
});

function autoRoute(themes: string[] = []): Consultant {
  const toMori = ['エンゲージメント','lon','コミュニケーション','人材育成','キャリア','心理的安全性','風土','関係性'];
  const toIshi = ['戦略','社外連携','業務設計','採用','評価','KPI','OKR','組織設計','プロセス'];
  if (themes.some(k => toMori.some(t => k.includes(t)))) return 'morigami';
  if (themes.some(k => toIshi.some(t => k.includes(t)))) return 'ishijima';
  return 'ishijima'; // デフォルト
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = Payload.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: 'invalid_payload' }, { status: 400 });
    }
    const p = parsed.data;

    const assigned: Consultant =
      p.assigneePref === 'either' ? autoRoute(p.themes || []) : (p.assigneePref as Consultant);

    // 1) 申込者へ（予約URL含む）
    const userMail = renderConsultIntakeMailToUser({
      name: p.name,
      consultant: assigned,
      resultId: p.resultId,
    });
    await sendMail({
      to: p.email,
      subject: userMail.subject,
      html: userMail.html,
      text: userMail.text,
    });

    // 2) 運用通知へ
    const opsMail = renderConsultIntakeMailToOps({
      email: p.email,
      name: p.name,
      companyName: p.companyName,
      companySize: p.companySize,
      industry: p.industry,
      consultant: assigned,
      resultId: p.resultId,
    });
    await sendMail({
      to: (process.env.MAIL_TO_OPS || 'info@ourdx-mtg.com').trim(),
      subject: opsMail.subject,
      html: opsMail.html,
      text: opsMail.text,
    });

    // 画面側で「予約URL」をすぐ見せたい場合に返す
    return NextResponse.json({
      ok: true,
      assignedTo: assigned,
      bookingUrl: bookingUrlFor(assigned),
    });
  } catch (e: any) {
    console.error('[api/consult-request] failed:', e);
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
