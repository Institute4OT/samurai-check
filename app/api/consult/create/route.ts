// app/api/consult/create/route.ts
export const runtime = 'nodejs';

import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { sendMail } from '@/lib/mail';
import {
  buildConsultEmail,
  REPORT_URL,
  bookingUrlFor,
} from '@/lib/emailTemplates';

type IntakeBody = {
  resultId?: string;
  name?: string;
  email?: string;
  ageRange2?: string;
  companySize?: string;
  industry?: string;
};

// ===== ユーティリティ =====
function getAbsoluteOrigin(req: NextRequest) {
  // NEXT_PUBLIC_BASE_URL を優先（例: https://app.example.com）
  const envBase = process.env.NEXT_PUBLIC_BASE_URL;
  if (envBase) return envBase.replace(/\/+$/, '');

  // それ以外はヘッダから構成
  const proto = (req.headers.get('x-forwarded-proto') || 'https').split(',')[0].trim();
  const host = (req.headers.get('x-forwarded-host') || req.headers.get('host') || 'localhost:3000')
    .split(',')[0]
    .trim();
  return `${proto}://${host}`;
}

// consult_intake に insert（service role で）
async function insertConsultIntake(payload: {
  result_id: string | null;
  name: string | null;
  email: string | null;
  age_range: string | null;
  company_size: string | null;
  industry: string | null;
}) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const sb = createClient(url, service);

  // token はユニーク・衝突回避リトライ
  for (let i = 0; i < 3; i++) {
    const token = randomUUID();
    const { data, error } = await sb
      .from('consult_intake')
      .insert({ ...payload, token })
      .select('id')
      .maybeSingle();

    if (!error && data) return { id: data.id as string, token };
    // 一意制約違反ならリトライ
    if (error && (error as any).code !== '23505') return { id: null, token: null, errorMessage: error.message };
  }
  return { id: null, token: null, errorMessage: 'token collision (retry exceeded)' };
}

// samurairesults を update（service role で）
async function updateSamuraiResultFields(resultId: string, fields: {
  name?: string | null;
  email?: string | null;
  company_size?: string | null;
  is_consult_request?: boolean;
}) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const sb = createClient(url, service);

  const { error } = await sb.from('samurairesults')
    .update(fields)
    .eq('id', resultId);
  return { ok: !error, message: error?.message };
}

// ===== Handler =====
export default async function POST(req: NextRequest) {
  const logs: string[] = [];
  const diagnostics: Record<string, any> = {};

  try {
    const body = (await req.json().catch(() => (null))) as IntakeBody | null;
    if (!body) {
      return NextResponse.json({ ok: false, error: 'invalid_payload' }, { status: 400 });
    }

    // 1) パラメータ整形
    const resultId = (body.resultId || '').trim() || null;
    const name = (body.name || '').trim() || null;
    const email = (body.email || '').trim() || null;
    const ageRange = (body.ageRange2 || '').trim() || null;
    const companySize = (body.companySize || '').trim() || null;
    const industry = (body.industry || '').trim() || null;

    logs.push('STEP1: parse ok');

    // 2) DB保存（consult_intake へ insert、samurairesults を update）
    const canWrite = !!process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (canWrite) {
      // consult_intake に insert
      const inserted = await insertConsultIntake({
        result_id: resultId,
        name,
        email,
        age_range: ageRange,
        company_size: companySize,
        industry,
      });
      diagnostics.consultIntake = inserted;

      // samurairesults を更新（氏名/会社規模/メール、ついでに申込フラグ）
      if (resultId) {
        const up = await updateSamuraiResultFields(resultId, {
          name,
          email,
          company_size: companySize,
          is_consult_request: true,
        });
        diagnostics.samurairesultsUpdate = up;
        logs.push(`STEP2: samurairesults update ${up.ok ? 'OK' : 'ERROR'}`);
      }
    } else {
      logs.push('STEP2: skip DB writes (no service role key)');
    }

    // 3) メール用リンクの用意
    const origin = getAbsoluteOrigin(req);
    const reportUrl = resultId ? REPORT_URL(resultId) : `${origin}/report`;
    const bookingUrl = bookingUrlFor(undefined, resultId ?? undefined, email ?? undefined);

    diagnostics.urls = { reportUrl, bookingUrl };

    // 4) 申込者へメール（旧API互換：buildConsultEmail({toName, reportUrl, bookingUrl})）
    const toName = name ? `${name} 様` : 'お客様';
    const mail = buildConsultEmail({
      toName,
      reportUrl,
      bookingUrl,
      offerNote: '申込者限定・先着3名', // 必要に応じて変更
    });

    await sendMail({
      to: email || (process.env.MAIL_TO_TRS || '').trim(),
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    });
    logs.push('STEP3: mail sent');

    return NextResponse.json({ ok: true, logs, diagnostics });
  } catch (err: any) {
    console.error('[api/consult/create] error:', err);
    return NextResponse.json({ ok: false, error: err?.message || String(err) }, { status: 500 });
  }
}
