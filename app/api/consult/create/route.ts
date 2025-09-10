// app/api/consult/create/route.ts
/* eslint-disable no-console */

// ==== Next.js / 外部 ====
import { NextResponse, NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';

// ==== プロジェクト内ユーティリティ ====
// - メール送信
import { sendMail } from '@/lib/mail';
// - 相談メール本文テンプレ
import { buildConsultEmail } from '@/lib/emailTemplates';

// ------------------------------------------------------------
// 環境変数
// ------------------------------------------------------------
const SERVICE_ROLE_KEY = (process.env.SUPABASE_SERVICE_ROLE_KEY || '').trim();
const SUPABASE_URL = (process.env.NEXT_PUBLIC_SUPABASE_URL || '').trim();

const REPORT_URL = (process.env.NEXT_PUBLIC_REPORT_URL || '').trim(); // 例: https://xxx/report
const BOOKING_BASE = (process.env.NEXT_PUBLIC_BOOKING_BASE_URL || '').trim(); // 例: https://xxx/consult

const MAIL_TO_TRS = (process.env.MAIL_TO_TRS || '').trim(); // テスト/フォールバック宛先

// ------------------------------------------------------------
// 型
// ------------------------------------------------------------
type Consultant = {
  id: string;
  name: string;
  email: string;
};

const IntakeBodySchema = z.object({
  rid: z.string().min(1).optional(),
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  ageRange: z.string().optional(),
  companySize: z.string().optional(),
  industry: z.string().optional(),
});

type IntakeBody = z.infer<typeof IntakeBodySchema>;

// ------------------------------------------------------------
// ユーティリティ
// ------------------------------------------------------------
function getAbsoluteOrigin(req: Request) {
  const url = new URL(req.url);
  return `${url.protocol}//${url.host}`;
}

function isUUIDLike(v?: string | null): v is string {
  if (!v) return false;
  return /^[0-9a-fA-F-]{8,}$/.test(v);
}

// クエリから担当コンサルを決定（既存の規約に合わせた簡易版）
function pickConsultantByQuery(req: NextRequest): Consultant {
  const url = new URL(req.url);
  const key = (url.searchParams.get('c') || url.searchParams.get('consultant') || '').toLowerCase();

  const MORIGAMI: Consultant = { id: 'morigami', name: '森上', email: 'morigami@example.com' };
  const ISHIJIMA: Consultant = { id: 'ishijima', name: '石島', email: 'ishijima@example.com' };

  if (key === 'morigami' || key === 'm') return MORIGAMI;
  if (key === 'ishijima' || key === 'i' || key === 'sachiko') return ISHIJIMA;
  return ISHIJIMA;
}

// Supabaseへの部分更新（rid が有効、かつ SERVICE_ROLE がある場合のみ）
async function updateSamuraiResultFields(
  rid: string | undefined,
  fields: Partial<{
    name: string | null;
    email: string | null;
    ageRange: string | null;
    companySize: string | null;
    industry: string | null;
  }>
) {
  const diagnostics: { ok: boolean; message?: string } = { ok: false };

  if (!rid || !isUUIDLike(rid) || !SERVICE_ROLE_KEY || !SUPABASE_URL) {
    diagnostics.ok = false;
    diagnostics.message = 'skip DB writes (no service role key or invalid rid)';
    return diagnostics;
  }

  const supabase = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const table = 'samurai_results'; // 既存テーブル名に合わせて必要なら変更

  const payload = {
    name: fields.name ?? null,
    email: fields.email ?? null,
    age_range: fields.ageRange ?? null,
    company_size: fields.companySize ?? null,
    industry: fields.industry ?? null,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase.from(table).update(payload).eq('id', rid);

  if (error) {
    diagnostics.ok = false;
    diagnostics.message = error.message;
  } else {
    diagnostics.ok = true;
  }
  return diagnostics;
}

// ------------------------------------------------------------
// ルート本体
// ------------------------------------------------------------
export const runtime = 'nodejs';

export async function POST(req: NextRequest) {
  const logs: string[] = [];
  const diagnostics: Record<string, any> = { urls: {} };

  try {
    // 1) body を JSON or form どちらでも受け取れるように
    let body: IntakeBody | null = null;
    const ctype = (req.headers.get('content-type') || '').toLowerCase();

    if (ctype.includes('application/json')) {
      body = IntakeBodySchema.partial().parse(await req.json());
    } else if (ctype.includes('application/x-www-form-urlencoded')) {
      const form = await req.formData();
      body = IntakeBodySchema.partial().parse({
        rid: String(form.get('rid') ?? ''),
        name: String(form.get('name') ?? ''),
        email: String(form.get('email') ?? ''),
        ageRange: String(form.get('ageRange') ?? ''),
        companySize: String(form.get('companySize') ?? ''),
        industry: String(form.get('industry') ?? ''),
      });
    } else {
      try {
        body = IntakeBodySchema.partial().parse(await req.json());
      } catch {
        body = {} as any;
      }
    }

    const rid = body?.rid?.trim() || undefined;
    const name = body?.name?.trim() || '';
    const email = body?.email?.trim() || '';
    const ageRange = body?.ageRange?.trim() || '';
    const companySize = body?.companySize?.trim() || '';
    const industry = body?.industry?.trim() || '';

    logs.push('STEP0: body parsed');

    // 2) DB 更新（SERVICE_ROLE があるときだけ）
    const up = await updateSamuraiResultFields(rid, {
      name: name || null,
      email: email || null,
      ageRange: ageRange || null,
      companySize: companySize || null,
      industry: industry || null,
    });
    diagnostics.samuraiResultsUpdate = up;
    logs.push(`STEP1: samurai_results update ${up.ok ? 'OK' : `ERROR(${up.message})`}`);

    // 3) 相談担当を決定
    const consultant = pickConsultantByQuery(req);
    diagnostics.consultant = consultant;

    // 4) 各種リンク生成（本番オリジン優先）
    const origin = getAbsoluteOrigin(req);

    // REPORT_URL は定数（関数呼び出しではない）
    const reportUrl = rid
      ? (REPORT_URL ? `${REPORT_URL}?rid=${encodeURIComponent(rid)}` : `${origin}/report?rid=${encodeURIComponent(rid)}`)
      : `${origin}/report`;

    // bookingUrl は自前で安全生成
    const bookingUrl = (() => {
      const base = BOOKING_BASE || `${origin}/consult`;
      const qs = new URLSearchParams();
      if (rid) qs.set('rid', rid);
      if (email) qs.set('email', email);
      const q = qs.toString();
      return q ? `${base}?${q}` : base;
    })();

    diagnostics.urls = { reportUrl, bookingUrl, origin };

    // 5) メール送信準備（型アダプタで1引数シグネチャに合わせる）
    const toName = name ? `${name} 様` : 'お客様';
    const mail = (buildConsultEmail as unknown as (arg: any) => any)({
      ...consultant,                  // Consultant型の必須フィールド(id/name/email 等)
      toName,
      reportUrl,
      bookingUrl,
      offerNote: '申込者限定・先着3名',
    });

    // 宛先：ユーザー or フォールバック
    const to = email || MAIL_TO_TRS;

    await sendMail({
      to: to.trim(),
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    });

    logs.push('STEP2: mail sent');

    // 6) 応答
    return NextResponse.json({ ok: true, logs, diagnostics });
  } catch (err: any) {
    console.error('[api/consult/create] error:', err);
    return NextResponse.json(
      { ok: false, error: err?.message ?? String(err) },
      { status: 500 }
    );
  }
}
