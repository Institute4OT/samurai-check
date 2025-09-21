/* eslint-disable no-console */
import { NextRequest, NextResponse } from "next/server";
import { sendMail } from "@/lib/mail";
import {
  buildReportEmailV2,
  type ReportEmailV2Input,
} from "@/lib/emailTemplatesV2";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";

const ok = (data: any, status = 200) => NextResponse.json(data, { status });
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
    if (v !== undefined && v !== null && String(v).trim() !== "")
      return String(v).trim();
  }
  return "";
}

function addUtm(url: string, content: string, extra?: Record<string, string | undefined>) {
  try {
    const u = new URL(url);
    u.searchParams.set("utm_source", "samurai-check");
    u.searchParams.set("utm_medium", "email");
    u.searchParams.set("utm_campaign", "report_ready");
    u.searchParams.set("utm_content", content);
    if (extra) for (const [k, v] of Object.entries(extra)) if (v) u.searchParams.set(k, v);
    return u.toString();
  } catch {
    return url;
  }
}

function buildLinks(req: NextRequest, rid?: string | null, overrides?: { report?: string; consult?: string; share?: string }) {
  const base = process.env.NEXT_PUBLIC_APP_URL?.trim() || originFrom(req);
  const bookingBase = process.env.NEXT_PUBLIC_BOOKING_URL?.trim() || `${base}/consult`;
  const shareBase = process.env.NEXT_PUBLIC_SHARE_URL?.trim() || base;

  const reportBase = overrides?.report || (rid ? `${base}/report/${encodeURIComponent(rid)}` : `${base}/report`);
  const consultBase = overrides?.consult || (rid ? `${bookingBase}?rid=${encodeURIComponent(rid)}` : bookingBase);
  const shareBaseUrl = overrides?.share || shareBase;

  const utmExtra = { utm_id: rid || undefined };
  return {
    reportLink: addUtm(reportBase, "cta_report", utmExtra),
    consultLink: addUtm(consultBase, "cta_consult", utmExtra),
    shareLink: addUtm(shareBaseUrl, "cta_share", utmExtra),
  };
}

function bucket(size?: string | null) {
  if (!size) return "small";
  const s = String(size).trim().replace(/[〜～~–—－]/g, "-").replace(/名/g, "");
  const plus = s.match(/(\d+)\s*(\+|以上)$/);
  if (plus) return Number(plus[1]) >= 51 ? "large" : "small";
  const le = s.match(/(\d+)\s*以下$/);
  if (le) return Number(le[1]) <= 50 ? "small" : "large";
  const m = s.match(/(\d+)\s*-\s*(\d+)/);
  if (m) return Number(m[2]) <= 50 ? "small" : "large";
  if (/^(1-10|11-50)$/.test(s)) return "small";
  if (/^(51-100|101-300|301-1000|1001.*)$/.test(s)) return "large";
  return "small";
}

async function readBody(req: NextRequest) {
  const ct = req.headers.get("content-type") || "";
  if (ct.includes("application/json")) return await req.json().catch(() => ({} as any));
  if (ct.includes("multipart/form-data")) {
    const fd = await req.formData();
    const o: Record<string, any> = {};
    fd.forEach((v, k) => (o[k] = typeof v === "string" ? v : v.name));
    return o;
  }
  return Object.fromEntries(req.nextUrl.searchParams.entries());
}

export async function POST(req: NextRequest) {
  try {
    const body = await readBody(req);

    const rid = param(body, "rid", "resultId", "id") || null;
    const toName = param(body, "name", "toName", "userName") || "ご担当者さま";
    const email = param(body, "email", "to");
    const typeName = param(body, "samuraiType", "typeName", "type") || "（タイプ判定中）";
    const companySize = param(body, "company_size", "companySize", "size") || "";

    // 申込フォーム系（DB保存用）
    const companyName = param(body, "company_name", "companyName", "company") || "";
    const industry = param(body, "industry") || "";
    const ageRange = param(body, "age_range", "ageRange") || "";

    const overrideReport = param(body, "reportLink", "report_url");
    const overrideConsult = param(body, "consultLink", "consult_url");
    const overrideShare = param(body, "shareLink", "share_url");

    if (!EMAIL_RE.test(email)) return err("invalid_email", 400);

    // --- DB upsert（samurairesults）: ここを追加 ---
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
      const admin = createClient(url, key, { auth: { persistSession: false } });

      await admin
        .from("samurairesults")
        .upsert(
          {
            id: rid ?? undefined,
            name: toName || null,
            email,
            company_name: companyName || null,
            company_size: companySize || null, // snake
            companySize: companySize || null,   // camel（どちらでも読めるよう重複保存）
            industry: industry || null,
            age_range: ageRange || null,
            is_consult_candidate: bucket(companySize) === "large",
          },
          { onConflict: "id", ignoreDuplicates: false },
        );
    } catch (e) {
      console.error("[report-request] upsert error:", e);
      // 失敗してもメール送信は続けます
    }

    const { reportLink, consultLink, shareLink } = buildLinks(req, rid, {
      report: overrideReport || undefined,
      consult: overrideConsult || undefined,
      share: overrideShare || undefined,
    });

    const seg = bucket(companySize);
    const input: ReportEmailV2Input = {
      toName,
      typeName,
      rid: rid || undefined,
      companySize,
      reportLink,
      consultLink,
      shareLink,
      // ★元コードの日本語プレフィックスをそのまま維持
      titlePrefix: seg === "large" ? "【武将タイプ診断アプリ特典】" : "【武将タイプ診断アプリ】",
    };
    const mail = buildReportEmailV2(input);

    const dataRes = await sendMail({
      to: email,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      tagId: rid || undefined,
    } as any);

    return ok({
      ok: true,
      to: email,
      subject: mail.subject,
      rid: rid || null,
      reportLink,
      consultLink,
      shareLink,
      providerId: (dataRes as any)?.id ?? null,
    });
  } catch (e: any) {
    console.error("[api/report-request] error:", e);
    return err(e?.message ?? String(e), 400);
  }
}
