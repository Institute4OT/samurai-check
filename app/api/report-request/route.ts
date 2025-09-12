// app/api/report-request/route.ts
/* eslint-disable no-console */
import { NextRequest, NextResponse } from 'next/server';
import { sendMail } from '@/lib/mail';
import { buildReportEmailV2, type ReportEmailV2Input } from '@/lib/emailTemplates';

export const runtime = 'nodejs';

/* ========== 小ユーティリティ ========== */
const ok  = (data: any, status = 200) => NextResponse.json(data, { status });
const err = (message: string, status = 400) =>
  NextResponse.json({ ok: false, error: message }, { status });

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

function originFrom(req: NextRequest) {
  const u = new URL(req.url);
  return `${u.protocol}//${u.host}`;
}

function param(payload: Record<string, any>, ...candidates: string[]) {
  for (const k of candidates) {
    const v = payload?.[k];
    if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
  }
  return '';
}

async function readPayload(req: NextRequest): Promise<Record<string, any>> {
  const ct = req.headers.get('content-type') || '';
  if (ct.includes('application/json')) {
    try { return await req.json(); } catch { return {}; }
  }
  if (ct.includes('application/x-www-form-urlencoded')) {
    const txt = await req.text();
    return Object.fromEntries(new URLSearchParams(txt));
  }
  if (ct.includes('multipart/form-data')) {
    const fd = await req.formData();
    const obj: Record<string, any> = {};
    fd.forEach((v, k) => { obj[k] = typeof v === 'string' ? v : ''; });
    return obj;
  }
  // クエリも許容
  return Object.fromEntries(req.nextUrl.searchParams.entries());
}

function addUtm(url: string, content: string, extra?: Record<string, string | undefined>) {
  try {
    const u = new URL(url);
    u.searchParams.set('utm_source', 'email');
    u.searchParams.set('utm_medium', 'transactional');
    u.searchParams.set('utm_campaign', 'report_v2');
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

  // 入力にURLが渡ってきていれば尊重、無ければ既定を作る
  const reportBase  = overrides?.report  || (rid ? `${base}/report/${encodeURIComponent(rid)}` : `${base}/report`);
  const consultBase = overrides?.consult || (rid ? `${bookingBase}?rid=${encodeURIComponent(rid)}` : bookingBase);

  // UTM 付与（rid は utm_id としても付与）
  const utmExtra = { utm_id: rid || undefined };
  return {
    reportLink:  addUtm(reportBase,  'cta_report',  utmExtra),
    consultLink: addUtm(consultBase, 'cta_consult', utmExtra),
  };
}

/* ========== Main ========== */
export async function POST(req: NextRequest) {
  try {
    const data = await readPayload(req);

    // 宛先メール
    const email = param(data, 'email', 'to', 'recipient');
    if (!email) return err('missing "email"');
    if (!EMAIL_RE.test(email)) return err('invalid "email"');

    // 宛名（無ければメールのローカル部）
    const toNameBase = param(data, 'userName', 'toName', 'recipientName') || email.split('@')[0];
    const toName = toNameBase || 'お客様';

    // タイプ／会社規模（キー揺れ吸収）
    const typeName    = param(data, 'samuraiType', 'samurai_type', 'type') || 'unknown';
    const companySize = param(data, 'companySize', 'company_size') || 'unknown';

    // rid / diagId（どちらでも受ける）
    const rid   = param(data, 'rid', 'resultId', 'id') || '';
    const diagId = param(data, 'diagId', 'diagnosisId') || rid || '';

    // URL 上書きがあれば取り込み
    const overrideReport  = param(data, 'reportLink', 'reportUrl');
    const overrideConsult = param(data, 'consultLink', 'bookingUrl');

    // リンク生成（UTM 付与）
    const { reportLink, consultLink } = buildLinks(
      req,
      rid || undefined,
      { report: overrideReport || undefined, consult: overrideConsult || undefined }
    );

    // V2テンプレに合わせた入力
    const input: ReportEmailV2Input = {
      toName,
      typeName,
      rid: rid || undefined,
      companySize,
      reportLink,
      consultLink,
    };

    const mail = buildReportEmailV2(input);

    // 送信
    const dataRes = await sendMail({
      to: email,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      replyTo: process.env.MAIL_REPLY_TO || undefined,
      tagId: `report_request:${diagId || 'na'}`,
    });

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
