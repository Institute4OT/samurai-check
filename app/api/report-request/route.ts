// app/api/report-request/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { sendMail } from '@/lib/mail';
import {
  renderReportRequestMailToUser,
  renderReportRequestMailToOps,
  bookingUrlFor,
  REPORT_URL,
  type Consultant,
} from '@/lib/emailTemplates';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const preferredRegion = ['hnd1']; // Tokyo

// 受信ペイロード（未知キーは無視）
const Schema = z
  .object({
    email: z.string().email(),
    name: z.string().min(1),
    companyName: z.string().optional(),
    companySize: z
      .enum(['1-10', '11-50', '51-100', '101-300', '301-500', '501-1000', '1001+'])
      .or(z.string())
      .optional(),
    industry: z.string().optional(),   // ★ 業種（必須にしたいなら .min(1) へ）
    ageRange: z.string().optional(),   // ★ 年齢帯
    resultId: z.string().optional(),
    consultant: z.enum(['ishijima', 'morigami']).optional(),
  })
  .passthrough();

function need(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`[report-request] missing env: ${name}`);
  return v;
}

// Service Role（RLSをバイパス）
function serviceClient() {
  return createClient(need('NEXT_PUBLIC_SUPABASE_URL'), need('SUPABASE_SERVICE_ROLE_KEY'));
}

export async function POST(req: Request) {
  try {
    const json = await req.json().catch(() => null);
    const parsed = Schema.safeParse(json);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: 'invalid_payload' }, { status: 400 });
    }
    const p = parsed.data;

    // 1) DB 反映（失敗しても処理は続行）
    const diagnostics: Record<string, any> = {};
    try {
      const sb = serviceClient();

      // consult_intake に控えを保存
      try {
        await sb.from('consult_intake').insert({
          result_id: p.resultId ?? null,
          name: p.name ?? null,
          email: p.email ?? null,
          company_name: p.companyName ?? null,
          company_size: p.companySize ?? null,
          industry: p.industry ?? null,     // ★ 追加
          age_range: p.ageRange ?? null,    // ★ 追加
        });
        diagnostics.consult_intake = 'inserted';
      } catch (e: any) {
        diagnostics.consult_intake = `skip: ${e?.message || String(e)}`;
      }

      // samurairesults を更新
      if (p.resultId) {
        const updates: Record<string, any> = {
          name: p.name ?? null,
          email: p.email ?? null,
          company_size: p.companySize ?? null,
          industry: p.industry ?? null,      // ★ 追加
          age_range: p.ageRange ?? null,     // ★ 追加
          is_consult_request: true,
        };
        if (p.companyName) updates.company_name = p.companyName; // カラムがある場合のみ

        const { error } = await sb.from('samurairesults').update(updates).eq('id', p.resultId);
        diagnostics.samurairesults = error ? `error: ${error.message}` : 'updated';
      }
    } catch (e: any) {
      diagnostics.db = `skip: ${e?.message || String(e)}`;
    }

    // 2) メール
    const userMail = renderReportRequestMailToUser({
      name: p.name,
      resultId: p.resultId,
      companySize: (p.companySize ?? '') as any,
      consultant: p.consultant as Consultant | undefined,
      email: p.email,
    });
    await sendMail({ to: p.email, subject: userMail.subject, html: userMail.html, text: userMail.text });

    const opsMail = renderReportRequestMailToOps({
      email: p.email,
      name: p.name,
      companyName: p.companyName,
      companySize: (p.companySize ?? '') as any,
      industry: (p.industry ?? 'その他') as any,
      resultId: p.resultId,
    });
    await sendMail({
      to: (process.env.MAIL_TO_OPS || 'info@ourdx-mtg.com').trim(),
      subject: opsMail.subject,
      html: opsMail.html,
      text: opsMail.text,
    });

    // 3) レスポンス（予約URL/レポートURLも返す）
    return NextResponse.json({
      ok: true,
      bookingUrl: bookingUrlFor(p.consultant as Consultant | undefined, p.resultId, p.email),
      reportUrl: p.resultId ? REPORT_URL(p.resultId) : undefined,
      diagnostics,
    });
  } catch (e: any) {
    console.error('[api/report-request] failed:', e);
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}
