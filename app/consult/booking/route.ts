// app/api/consult/booking/route.ts
// 旧フロントからの投稿互換エンドポイント。
// /api/consult-request 相当の処理で受ける。

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
export const preferredRegion = ['hnd1']; // Tokyo

type Consultant = 'ishijima' | 'morigami';

// 文字列/配列どちらでも受ける（旧UI互換）
const Payload = z
  .object({
    email: z.string().email(),
    name: z.string().min(1),
    companyName: z.string().optional(),
    companySize: z.string().optional(),
    industry: z.string().optional(),
    resultId: z.string().optional(),
    themes: z.union([z.array(z.string()), z.string()]).optional(),
    style: z.union([z.array(z.string()), z.string()]).optional(),
    note: z.string().optional(),
    assigneePref: z.enum(['either', 'ishijima', 'morigami']).default('either'),
  })
  .passthrough();

function toArr(v: unknown): string[] {
  if (!v) return [];
  if (Array.isArray(v)) return v.map(String).filter(Boolean);
  return String(v)
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean);
}

function autoRoute(themes: string[] = []): Consultant {
  const toMori = ['エンゲージメント', 'lon', 'コミュニケーション', '人材育成', 'キャリア', '心理的安全性', '風土', '関係性'];
  const toIshi = ['戦略', '社外連携', '業務設計', '採用', '評価', 'KPI', 'OKR', '組織設計', 'プロセス'];
  if (themes.some((k) => toMori.some((t) => k.includes(t)))) return 'morigami';
  if (themes.some((k) => toIshi.some((t) => k.includes(t)))) return 'ishijima';
  return 'ishijima';
}

async function handle(payload: unknown) {
  const raw = (payload && typeof payload === 'object' ? payload : {}) as Record<string, unknown>;
  raw.themes = toArr(raw.themes);
  raw.style = toArr(raw.style);

  const parsed = Payload.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ ok: false, error: 'invalid_payload' }, { status: 400 });
  }
  const p = parsed.data;

  const assigned: Consultant =
    p.assigneePref === 'either' ? autoRoute(p.themes as string[]) : (p.assigneePref as Consultant);

  // 1) 申込者へ
  const userMail = renderConsultIntakeMailToUser({
    name: p.name,
    consultant: assigned,
    resultId: p.resultId,
    email: p.email,
  });
  await sendMail({ to: p.email, subject: userMail.subject, html: userMail.html, text: userMail.text });

  // 2) 運用者へ
  const opsMail = renderConsultIntakeMailToOps({
    email: p.email,
    name: p.name,
    companyName: p.companyName,
    companySize: p.companySize,
    industry: p.industry,
    resultId: p.resultId,
    message: `via /api/consult/booking${p.note ? ` / note:${p.note}` : ''}${
      (p.style as string[]).length ? ` / style:${(p.style as string[]).join(',')}` : ''
    }`,
  });
  await sendMail({
    to: (process.env.MAIL_TO_OPS || 'info@ourdx-mtg.com').trim(),
    subject: opsMail.subject,
    html: opsMail.html,
    text: opsMail.text,
  });

  return NextResponse.json({
    ok: true,
    assignedTo: assigned,
    bookingUrl: bookingUrlFor(assigned, p.resultId, p.email),
  });
}

export async function POST(req: Request) {
  try {
    // JSON → だめなら form-data の順で受ける
    try {
      const body = await req.json();
      return await handle(body);
    } catch {
      const fd = await req.formData();
      const obj = Object.fromEntries(fd.entries());
      return await handle(obj);
    }
  } catch (e: any) {
    console.error('[api/consult/booking] failed:', e);
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}

// プリフライト許可（念のため）
export function OPTIONS() {
  return NextResponse.json({}, { status: 200 });
}
