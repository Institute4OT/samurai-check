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

// ---- 入力を厳しめに正規化（ただし未知フィールドは無視して落ちない）----
const Schema = z
  .object({
    email: z.string().email(),
    name: z.string().min(1),
    companyName: z.string().optional(),
    companySize: z
      .enum(['1-10', '11-50', '51-100', '101-300', '301-500', '501-1000', '1001+'])
      .or(z.string())
      .optional(),
    industry: z.string().optional(),
    resultId: z.string().optional(),
    consultant: z.enum(['ishijima', 'morigami']).optional(),
  })
  .passthrough();

function need(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`[report-request] missing env: ${name}`);
  return v;
}

// service role client（RLSをバイパスして書き込み）
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

    // 1) DB保存（失敗しても落とさない・diagnosticsに載せる）
    const diagnostics: any = {};
    try {
      const sb = serviceClient();

      // consult_intake へ控え（テーブルに存在する列だけを指定）
      try {
        await sb
          .from('consult_intake')
          .insert({
            result_id: p.resultId ?? null,
            name: p.name ?? null,
            email: p.email ?? null,
            company_name: p.companyName ?? null,
            company_size: p.companySize ?? null,
            industry: p.industry ?? null,
          });
        diagnostics.consult_intake = 'inserted';
      } catch (e: any) {
        diagnostics.consult_intake = `skip: ${e?.message || String(e)}`;
      }

      // samurairesults を更新（氏名/規模/メール/申込フラグ）
      if (p.resultId) {
        const { error } = await sb
          .from('samurairesults')
          .update({
            name: p.name ?? null,
            email: p.email ?? null,
            company_size: p.companySize ?? null,
            is_consult_request: true,
          })
          .eq('id', p.resultId);
        diagnostics.samurairesults = error ? `error: ${error.message}` : 'updated';
      }
    } catch (e: any) {
      diagnostics.db = `skip: ${e?.message || String(e)}`;
      // 書き込みに失敗してもメール＆レスポンスは続行
    }

    // 2) メール作成＆送信
    const userMail = renderReportRequestMailToUser({
      name: p.name,
      resultId: p.resultId,
      companySize: (p.companySize ?? '') as any,
      consultant: p.consultant as Consultant | undefined,
      email: p.email,
    });
    await sendMail({
      to: p.email,
      subject: userMail.subject,
      html: userMail.html,
      text: userMail.text,
    });

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

    // 3) 画面側へも予約URLを返す（任意で使える）
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
