// app/api/consult/create/route.ts
export const runtime = "nodejs";

import { NextResponse, NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { randomUUID } from "crypto";
import { sendMail } from "@/lib/mail";
import { buildConsultEmail } from "@/lib/emailTemplates";

type IntakeBody = {
  resultId?: string;
  name?: string;
  email?: string;
  ageRange?: string;
  companySize?: string;
  industry?: string;
};

function getAbsoluteOrigin(req: NextRequest) {
  // 本番なら NEXT_PUBLIC_BASE_URL を優先（例: https://app.example.com）
  const envBase = process.env.NEXT_PUBLIC_BASE_URL;
  if (envBase) return envBase.replace(/\/+$/, "");
  // それ以外はヘッダから復元
  const proto = (req.headers.get("x-forwarded-proto") || "http").split(",")[0].trim();
  const host = (req.headers.get("x-forwarded-host") || req.headers.get("host") || "localhost:3000")
    .split(",")[0]
    .trim();
  return `${proto}://${host}`;
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

  // token はユニーク。衝突時は数回リトライ
  for (let i = 0; i < 3; i++) {
    const token = randomUUID();
    const { data, error } = await sb
      .from("consult_intake")
      .insert({ ...payload, token })
      .select("id, token")
      .maybeSingle();

    if (!error && data) return { id: data.id as string, token: data.token as string };
    if (error && (error as any).code !== "23505") {
      return { id: null, token: null, errorMessage: error.message };
    }
  }
  return { id: null, token: null, errorMessage: "token collision (retry exceeded)" };
}

export async function POST(req: NextRequest) {
  const logs: string[] = [];
  const diagnostics: Record<string, any> = {};

  try {
    logs.push("STEP0: start");

    // 1) 受信
    const body = (await req.json().catch(() => ({}))) as IntakeBody;
    const resultId = (body.resultId || "").trim();
    const name = (body.name || "").trim();
    const email = (body.email || "").trim();
    const ageRange = body.ageRange || "";
    const companySize = body.companySize || "";
    const industry = (body.industry || "").trim();

    diagnostics.requestBody = { resultId, name, email, ageRange, companySize, industry };
    logs.push(`STEP1: parse ok -> resultId=${resultId || "-"}, email=${email || "-"}`);

    // 2) DB保存（失敗しても後続は継続）
    let consultId: string | null = null;
    let token: string | null = null;

    try {
      const envOk = process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (!envOk) {
        logs.push("STEP2: supabase env NG");
      } else {
        const res = await insertConsultIntake({
          result_id: resultId || null,
          name: name || null,
          email: email || null,
          age_range: ageRange || null,
          company_size: companySize || null,
          industry: industry || null,
        });
        consultId = res.id;
        token = res.token;
        if (consultId && token) {
          logs.push("STEP2: supabase insert OK");
        } else {
          logs.push(`STEP2: supabase insert ERROR: ${res.errorMessage || "unknown"}`);
          diagnostics.supabaseError = res.errorMessage || "unknown";
        }
      }
    } catch (e: any) {
      logs.push(`STEP2: supabase exception: ${String(e?.message || e)}`);
      diagnostics.supabaseException = String(e?.message || e);
    }

    // 3) メール内リンク用の絶対URL
    const origin = getAbsoluteOrigin(req);
    const reportUrl = `${origin}/report?resultId=${encodeURIComponent(resultId || "")}`;

    // /consult/start は resultId 必須なので、token と併せて必ず付与
    const hasToken = Boolean(token);
    const bookingUrl =
      `${origin}/consult/start` +
      `${hasToken ? `?token=${encodeURIComponent(token as string)}` : "?"}` +
      `${hasToken ? "&" : ""}resultId=${encodeURIComponent(resultId || "")}`;

    diagnostics.urls = { reportUrl, bookingUrl, origin, consultId, token };

    // 4) ユーザー宛メール（申込者限定の無料相談を強調）
    const toUser = email || process.env.MAIL_TO_TEST || "";
    const safeName = name || "お客さま";
    const mail = buildConsultEmail({
      toName: safeName,
      reportUrl,
      bookingUrl,
      // offerNote: "申込者限定・先着5名", // 必要に応じて上書き
    });

    logs.push("STEP3: mail compose (user)");
    const info = await sendMail({
      to: toUser,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    });
    logs.push(`STEP4: mail sent (user): ${info.messageId}`);

    // 管理者通知は現状送らない
    // logs.push("STEP5: admin notify skipped");

    return NextResponse.json({ ok: true, logs, diagnostics });
  } catch (err: any) {
    console.error("consult/create error", err);
    const logs2 = [`FATAL: ${String(err?.message || err)}`];
    return NextResponse.json({ ok: false, logs: logs2 }, { status: 500 });
  }
}
