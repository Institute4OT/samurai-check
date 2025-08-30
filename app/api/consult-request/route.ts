// app/api/consult-request/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { sendMail } from '@/lib/mail';
import {
  renderConsultIntakeMailToUser,
  renderConsultIntakeMailToOps,
  bookingUrlFor,
} from '@/lib/emailTemplates';
import type { Consultant as EmailConsultant } from '@/lib/emailTemplates';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const preferredRegion = ['hnd1']; // Tokyo(羽田)

type Consultant = 'ishijima' | 'morigami';

// ===== Zod: 受信ペイロード（必須/任意は寛容めに）
const Payload = z.object({
  email: z.string().email(),
  name: z.string().min(1),
  resultId: z.string().optional(),

  companyName: z.string().optional(),
  companySize: z.string().optional(), // '1-10' | '11-50' | ... などの文字列
  industry: z.string().optional(),
  ageRange: z.string().optional(),

  // 自動割当のヒント（任意）
  themes: z.array(z.string()).optional(),
  style: z.array(z.string()).optional(),
  note: z.string().optional(),
  assigneePref: z.enum(['either', 'ishijima', 'morigami']).default('either'),
});

// ===== どちらに振るかの簡易ルール（日本語キーワード）
function autoRoute(themes: string[] = []): Consultant {
  const toMori = ['エンゲージメント', 'コミュニケーション', '人材育成', 'キャリア', '心理的安全性', '風土', '関係性'];
  const toIshi = ['会議', '会議設計', '権限委譲', 'リーダー', '戦略', '社外連携', '業務設計', '採用', '評価', 'KPI', 'OKR', '組織設計', 'プロセス'];
  if (themes.some(k => toMori.some(t => k.includes(t)))) return 'morigami';
  if (themes.some(k => toIshi.some(t => k.includes(t)))) return 'ishijima';
  return 'ishijima'; // デフォルト
}

// ===== env helper
function needEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`[consult-request] missing env: ${name}`);
  return v;
}

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null);
    const parsed = Payload.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: 'invalid_payload' }, { status: 400 });
    }
    const p = parsed.data;

    // 担当割り振り
    const assigned: Consultant =
      p.assigneePref === 'either' ? autoRoute(p.themes || []) : (p.assigneePref as Consultant);

    // ====== DB 反映（best-effort）
    try {
      const admin = createClient(
        needEnv('NEXT_PUBLIC_SUPABASE_URL'),
        needEnv('SUPABASE_SERVICE_ROLE_KEY'),
        { auth: { persistSession: false } },
      );

      // 1) consult_intake に記録（存在するカラムだけ使う）
      const intake: Record<string, any> = {
        result_id: p.resultId ?? null,
        name: p.name,
        email: p.email,
        company_name: p.companyName ?? null,
        company_size: p.companySize ?? null,
        industry: p.industry ?? null,
        age_range: p.ageRange ?? null,
      };
      await admin.from('consult_intake').insert(intake);

      // 2) samurairesults を更新（結果行があるとき）
      if (p.resultId) {
        const updates: Record<string, any> = {
          is_consult_request: true,
          name: p.name,
          email: p.email,
          // ★ ここから下の optional は「来た時だけ」上書き
        };
        if (p.companyName) updates.company_name = p.companyName; // ← 追加
        if (p.companySize) updates.company_size = p.companySize;
        if (p.industry)    updates.industry     = p.industry;
        if (p.ageRange)    updates.age_range    = p.ageRange;

        await admin.from('samurairesults').update(updates).eq('id', p.resultId);
      }
    } catch (dbErr) {
      console.error('[consult-request] DB update failed (non-blocking):', dbErr);
      // DBエラーでもメール送信は続行
    }

    // ====== 1) 申込者へ（予約URLつき）
    const userMail = renderConsultIntakeMailToUser({
      name: p.name,
      consultant: assigned as EmailConsultant,
      resultId: p.resultId,
      email: p.email,
    });
    await sendMail({
      to: p.email,
      subject: userMail.subject,
      html: userMail.html,
      text: userMail.text,
    });

    // ====== 2) 運用通知（補足情報を本文に同梱）
    const opsMail = renderConsultIntakeMailToOps({
      email: p.email,
      name: p.name,
      companyName: p.companyName,
      companySize: p.companySize,
      industry: p.industry,
      resultId: p.resultId,
      message: `担当候補:${assigned}${
        p.style?.length ? ` / style:${p.style.join(',')}` : ''
      }${p.note ? ` / note:${p.note}` : ''}`,
    });
    await sendMail({
      to: (process.env.MAIL_TO_OPS || 'info@ourdx-mtg.com').trim(),
      subject: opsMail.subject,
      html: opsMail.html,
      text: opsMail.text,
    });

    // ====== 画面側に返す（予約URLを即表示したい場合）
    return NextResponse.json({
      ok: true,
      assignedTo: assigned,
      bookingUrl: bookingUrlFor(assigned as EmailConsultant, p.resultId, p.email),
    });
  } catch (e: any) {
    console.error('[api/consult-request] failed:', e);
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
