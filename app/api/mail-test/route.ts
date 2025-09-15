// app/api/mail-test/route.ts
import { NextRequest, NextResponse } from "next/server";
import { sendMail } from "@/lib/mail";
import {
  buildReportEmailV2,
  type ReportEmailV2Input,
} from "@/lib/emailTemplates";

function ok(data: any, status = 200) {
  return NextResponse.json(data, { status });
}
function err(message: string, status = 400) {
  return NextResponse.json({ ok: false, error: message }, { status });
}

function originFrom(req: NextRequest) {
  const u = new URL(req.url);
  return `${u.protocol}//${u.host}`;
}

function param(payload: Record<string, any>, ...candidates: string[]) {
  for (const k of candidates) {
    const v = payload?.[k];
    if (v !== undefined && v !== null && String(v).trim() !== "")
      return String(v).trim();
  }
  return "";
}

async function readPayload(req: NextRequest): Promise<Record<string, any>> {
  const ct = req.headers.get("content-type") || "";
  if (ct.includes("application/json")) {
    try {
      return await req.json();
    } catch {
      return {};
    }
  }
  if (ct.includes("application/x-www-form-urlencoded")) {
    const txt = await req.text();
    return Object.fromEntries(new URLSearchParams(txt));
  }
  if (ct.includes("multipart/form-data")) {
    const fd = await req.formData();
    const obj: Record<string, any> = {};
    fd.forEach((v, k) => {
      obj[k] = typeof v === "string" ? v : "";
    });
    return obj;
  }
  return Object.fromEntries(req.nextUrl.searchParams.entries());
}

function buildLinks(req: NextRequest, rid?: string | null) {
  const base = process.env.NEXT_PUBLIC_APP_URL?.trim() || originFrom(req);
  const shareBase = process.env.NEXT_PUBLIC_SHARE_URL?.trim() || base; // ← 使わないが将来用に残す
  const bookingBase =
    process.env.NEXT_PUBLIC_BOOKING_URL?.trim() || `${base}/consult`;

  const reportLink = rid
    ? `${base}/report/${encodeURIComponent(rid)}`
    : `${base}/report`;
  const consultLink = rid
    ? `${bookingBase}?rid=${encodeURIComponent(rid)}`
    : bookingBase;

  return { reportLink, consultLink, shareLink: shareBase };
}

/* =======================
   GET: プレビュー（送信なし）
   ======================= */
export async function GET(req: NextRequest) {
  const q = Object.fromEntries(req.nextUrl.searchParams.entries());
  const name =
    param(q, "name", "toName", "userName", "recipientName") || "SACHIKOさん";
  const typeName = param(q, "samuraiType", "type") || "真田幸村型";
  const companySize = param(q, "companySize", "size") || "11-50";
  const rid = param(q, "rid", "resultId", "id") || "dev-preview-id";

  const links = buildLinks(req, rid);
  const mail = buildReportEmailV2({
    toName: name,
    typeName,
    rid,
    companySize,
    reportLink: links.reportLink,
    consultLink: links.consultLink,
  });

  return ok({
    ok: true,
    subject: mail.subject,
    htmlPreviewBytes: Buffer.byteLength(mail.html, "utf8"),
    sample: {
      name,
      typeName,
      companySize,
      rid,
      reportLink: links.reportLink,
      consultLink: links.consultLink,
    },
  });
}

/* =======================
   POST: 実送信（Resend 経由）
   ======================= */
export async function POST(req: NextRequest) {
  const p = await readPayload(req);

  const to = param(p, "to", "email");
  const name = param(p, "name", "toName", "userName", "recipientName") || "";
  const typeName = param(p, "samuraiType", "type") || "";
  const companySize = param(p, "companySize", "size") || "";
  const rid = param(p, "rid", "resultId", "id") || "";

  if (!to) return err('missing "to"');
  if (!name) return err('missing "name"');
  if (!typeName) return err('missing "typeName"');

  const { reportLink, consultLink } = buildLinks(req, rid || undefined);

  const input: ReportEmailV2Input = {
    toName: name,
    typeName,
    rid: rid || undefined,
    companySize,
    reportLink,
    consultLink,
  };
  const mail = buildReportEmailV2(input);

  await sendMail({
    to,
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
  });

  return ok({
    ok: true,
    to,
    subject: mail.subject,
    reportLink,
    consultLink,
    rid: rid || null,
  });
}
