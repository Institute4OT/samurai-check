// app/api/report-request/route.ts
/* eslint-disable no-console */
import { NextRequest, NextResponse } from 'next/server';
import { sendMail } from '@/lib/mail';
import { buildReportEmailV2, type ReportEmailV2Input } from '@/lib/emailTemplates';

export const runtime = 'nodejs';

/* ========== helper ========== */
const ok  = (data: any, status = 200) => NextResponse.json(data, { status });
const err = (message: string, status = 400) =>
  NextResponse.json({ ok: false, error: message }, { status });

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

function originFrom(req: NextRequest) {
  const u = new URL(req.url);
  return `${u.protocol}//${u.host}`;
}

function param(payload: Record<string, any>, ...cands: string[]) {
  for (const k of cands) {
    const v = payload?.[k];
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
}

// rid を UTM, rid クエリに埋め込む
function addUtm(url: string, content: string, extra?: Record<string, string | undefined>) {
  try {
    const u = new URL(url);
    u.searchParams.set('utm_source', 'samurai-check');
    u.searchParams.set('utm_medium', 'email');
    u.searchParams.set('utm_campaign', 'report_ready');
    u.searchParams.set('utm_content', content);
    if (extra) {
      for (const [k, v] of Object.entries(extra)) {
        if (v) u.searchParams.set(k, v);
      }
    }
    return u.toString();
  } catch {
    return url;
  }
}

function buildLinks(req: NextRequest, rid?: string | null, overrides?: { report?: string; consult?: string }) {
  const base = process.env.NEXT_PUBLIC_APP_URL?.trim() || originFrom(req);
  const bookingBase = process.env.NEXT_PUBLIC_BOOKING_URL?.trim() || `${base}/consult`;

  const reportBase  = overrides?.report  || (rid ? `${base}/report/${encodeURIComponent(rid)}` : `${base}/report`);
  const consultBase = overrides?.consult || (rid ? `${bookingBase}?rid=${encodeURIComponent(rid)}` : bookingBase);

  const utmExtra = { utm_id: rid || undefined };
  return {
    reportLink:  addUtm(reportBase,  'cta_report',  utmExtra),
    consultLink: addUtm(consultBase, 'cta_consult', utmExtra),
  };
}

// 会社規模を 50 以下 / 51 以上の 2 区分に
function is51Plus(size?: string | null) {
  if (!size) return false;
  const s = String(size).trim();
  return /^(51-100|101-300|301-500|501-1000|1001\+)$/.test(s);
}

/* ========== Main ========== */
export async function POST(req: NextRequest) {
  try {
    // 1) 入力を吸収（snake/camel 両対応）
    const body = await (async () => {
      const ct = req.headers.get('content-type') || '';
      if (ct.includes('application/json')) return await req.json().catch(() => ({} as any));
      if (ct.includes('multipart/form-data')) {
        const fd = await req.formData();
        const o: Record<string, any> = {};
        fd.forEach((v, k) => { o[k] = typeof v === 'string' ? v : v.name; });
        return o;
      }
      return Object.fromEntries(req.nextUrl.searchParams.entries());
    })();

    const rid         = param(body, 'rid', 'resultId', 'id') || null;
    const toName      = param(body, 'name', 'toName', 'userName') || 'ご担当者さま';
    const email       = param(body, 'email', 'to');
    const typeName    = param(body, 'samuraiType', 'typeName', 'type') || '（タイプ判定中）';
    const companySize = param(body, 'company_size', 'companySize', 'size') || '';
    const overrideReport  = param(body, 'reportLink', 'report_url');
    const overrideConsult = param(body, 'consultLink', 'consult_url');

    if (!EMAIL_RE.test(email)) return err('invalid_email', 400);

    // 2) リンク生成
    const { reportLink, consultLink } = buildLinks(req, rid, {
      report:  overrideReport  || undefined,
      consult: overrideConsult || undefined,
    });

    // 3) メール生成（51名以上は件名に“アプリ特典”を明示）
    const input: ReportEmailV2Input = {
      toName,
      typeName,
      rid: rid || undefined,
      companySize,
      reportLink,
      consultLink,
      titlePrefix: is51Plus(companySize) ? '【武将タイプ診断アプリ特典】' : '【武将タイプ診断】',
    };
    const mail = buildReportEmailV2(input);

    // 4) 送信
    const dataRes = await sendMail({
      to: email,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      tagId: rid || undefined,
    } as any);

    // 5) 返却
    return ok({
      ok: true,
      to: email,
      subject: mail.subject,
      rid: rid || null,
      reportLink,
      consultLink,
      providerId: (dataRes as any)?.id ?? null,
    });
  } catch (e: any) {
    console.error('[api/report-request] error:', e);
    return err(e?.message ?? String(e), 400);
  }
}
