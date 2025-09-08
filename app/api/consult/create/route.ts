// app/api/consult/create/route.ts
export const runtime = 'nodejs';

import { NextResponse, NextRequest } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { randomUUID } from 'crypto';
import { sendMail } from '@/lib/mail';
import { buildConsultEmail, REPORT_URL, bookingUrlFor } from '@/lib/emailTemplates';

/** 受理する入力（JSON / form-data どちらでもOKに寄せる） */
type IntakeBody = {
  rid?: string;
  resultId?: string;
  id?: string;
  name?: string;
  email?: string;
  ageRange2?: string;
  companySize?: string | number;
  industry?: string;
};

/* ───────── helpers ───────── */

function isIdish(v?: string | null): boolean {
  if (!v) return false;
  const s = v.trim();
  const uuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  const ulid = /^[0-9A-HJKMNP-TV-Z]{26}$/;
  const generic = /^[A-Za-z0-9_-]{16,}$/; // NanoID 等
  return uuid.test(s) || ulid.test(s) || generic.test(s);
}

function getAbsoluteOrigin(req: NextRequest) {
  // 本番URLを優先（環境変数の種類ゆれ吸収）
  const base =
    process.env.NEXT_PUBLIC_SITE_URL ||
    process.env.NEXT_PUBLIC_BASE_URL ||
    process.env.NEXT_PUBLIC_VERCEL_URL && `https://${process.env.NEXT_PUBLIC_VERCEL_URL}`;
  if (base) return String(base).replace(/\/+$/, '');

  // ヘッダから復元
  const proto = (req.headers.get('x-forwarded-proto') || 'https').split(',')[0].trim();
  const host = (req.headers.get('x-forwarded-host') || req.headers.get('host') || 'localhost:3000')
    .split(',')[0]
    .trim();
  return `${proto}://${host}`;
}

/** URLのクエリに rid/結果ID が来たときも拾う */
function pickRidFromQuery(req: NextRequest): string | null {
  const u = req.nextUrl;
  const q =
    u.searchParams.get('rid') ||
    u.searchParams.get('resultId') ||
    u.searchParams.get('id');
  return q ? q.trim() : null;
}

/** ボディ・クエリ・“それっぽい文字列”の順でRIDを決定 */
function pickRid(req: NextRequest, body?: IntakeBody | null): string | null {
  const fromBody =
    body?.rid?.trim() ||
    body?.resultId?.trim() ||
    body?.id?.trim() ||
    null;

  const fromQuery = pickRidFromQuery(req);

  const v = fromBody || fromQuery;
  if (v) return v;

  // クエリのパス末尾がIDらしい場合を保険で拾う（/consult/create/<id>など）
  const segs = req.nextUrl.pathname.split('/').filter(Boolean);
  for (let i = segs.length - 1; i >= 0; i--) {
    const s = decodeURIComponent(segs[i] || '');
    if (isIdish(s)) return s.trim();
  }
  return null;
}

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

  for (let i = 0; i < 3; i++) {
    const token = randomUUID();
    const { data, error } = await sb
      .from('consult_intake')
      .insert({ ...payload, token })
      .select('id')
      .maybeSingle();

    if (!error && data) return { id: String(data.id), token };
    if (error && (error as any).code !== '23505') {
      return { id: null, token: null, errorMessage: error.message };
    }
  }
  return { id: null, token: null, errorMessage: 'token collision (retry exceeded)' };
}

async function updateSamuraiResultFields(
  resultId: string,
  fields: { name?: string | null; email?: string | null; company_size?: string | null; is_consult_request?: boolean }
) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const service = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const sb = createClient(url, service);

  const { error } = await sb.from('samurairesults').update(fields).eq('id', resultId);
  return { ok: !error, message: (error as any)?.message };
}

/* ───────── handler ───────── */

export async function POST(req: NextRequest) {
  const logs: string[] = [];
  const diagnostics: Record<string, any> = {};

  try {
    // 1) ボディは JSON / form-data どちらでも受付
    let body: IntakeBody | null = null;
    const ct = (req.headers.get('content-type') || '').toLowerCase();

    if (ct.includes('application/json')) {
      body = (await req.json().catch(() => null)) as IntakeBody | null;
    } else if (ct.includes('multipart/form-data') || ct.includes('application/x-www-form-urlencoded')) {
      const fd = await req.formData().catch(() => null);
      if (fd) {
        body = {
          rid: String(fd.get('rid') ?? ''),
          resultId: String(fd.get('resultId') ?? ''),
          id: String(fd.get('id') ?? ''),
          name: String(fd.get('name') ?? ''),
          email: String(fd.get('email') ?? ''),
          ageRange2: String(fd.get('ageRange2') ?? ''),
          companySize: String(fd.get('companySize') ?? ''),
          industry: String(fd.get('industry') ?? ''),
        };
      }
    } else {
      // コンテンツタイプ不明でも一応JSONで試す
      body = (await req.json().catch(() => null)) as IntakeBody | null;
    }

    if (!body) {
      return NextResponse.json({ ok: false, error: 'invalid_payload' }, { status: 400 });
    }
    logs.push('STEP1: parse ok');

    // 2) 正規化
    const ridRaw = pickRid(req, body);
    const rid = ridRaw?.trim() || null; // 形式は後で判断
    const name = (body.name || '').trim() || null;
    const email = (body.email || '').trim() || null;
    const ageRange = (body.ageRange2 || '').toString().trim() || null;
    const companySize = (body.companySize ?? '').toString().trim() || null;
    const industry = (body.industry || '').trim() || null;

    diagnostics.input = { rid, name, email, ageRange, companySize, industry };

    // 3) DB writes（service role のみ）
    if (process.env.SUPABASE_SERVICE_ROLE_KEY) {
      const inserted = await insertConsultIntake({
        result_id: rid,
        name,
        email,
        age_range: ageRange,
        company_size: companySize,
        industry,
      });
      diagnostics.consultIntake = inserted;

      // ridが「それっぽい」場合のみ samurairesults を更新（不正IDでのエラー防止）
      if (rid && isIdish(rid)) {
        const up = await updateSamuraiResultFields(rid, {
          name,
          email,
          company_size: companySize,
          is_consult_request: true,
        });
        diagnostics.samurairesultsUpdate = up;
        logs.push(`STEP2: samurairesults update ${up.ok ? 'OK' : `ERROR(${up.message})`}`);
      } else {
        logs.push('STEP2: skip samurairesults update (rid not id-like)');
      }
    } else {
      logs.push('STEP2: skip DB writes (no service role key)');
    }

    // 4) リンク（本番オリジン優先）
    const origin = getAbsoluteOrigin(req);
    const reportUrl = rid ? REPORT_URL(rid) : `${origin}/report`;
    const bookingUrl = bookingUrlFor(undefined, rid ?? undefined, email ?? undefined);
    diagnostics.urls = { reportUrl, bookingUrl, origin };

    // 5) メール送信（宛先未入力ならオペ用にフォールバック）
    const toName = name ? `${name} 様` : 'お客様';
    const mail = buildConsultEmail({ toName, reportUrl, bookingUrl, offerNote: '申込者限定・先着3名' });

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
