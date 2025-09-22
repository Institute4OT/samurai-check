// app/api/report-request/route.ts
/* eslint-disable no-console */
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { sendMail } from "@/lib/mail";
import { buildReportEmailV2 } from "@/lib/emailTemplatesV2";

export const runtime = "nodejs";

// 入力: レポート申込フォームの値（シンプル＆厳密）
const Body = z.object({
  rid: z.string().uuid(),
  name: z.string().min(1).max(120),
  email: z.string().email(),
  companyName: z.string().optional().nullable(),
  companySize: z.string().optional().nullable(),
  industry: z.string().optional().nullable(),
  ageRange: z.string().optional().nullable(),
});

export async function POST(req: NextRequest) {
  // ---- Body parse
  const json = await req.json().catch(() => null);
  const parsed = Body.safeParse(json);
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: "invalid_body", detail: parsed.error.format() },
      { status: 400 }
    );
  }
  const body = parsed.data;

  // ---- Supabase upsert（samurairesults に保存）
  try {
    const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
    // SRK があれば使い、無ければ ANON（RLS 設定次第でbest-effort）
    const key =
      process.env.SUPABASE_SERVICE_ROLE_KEY ||
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
    const admin = createClient(url, key, { auth: { persistSession: false } });

    const { data: prev } = await admin
      .from("samurairesults")
      .select("id, uuid, company_size, industry, age_range, name, email")
      .or(`id.eq.${body.rid},uuid.eq.${body.rid}`)
      .limit(1)
      .maybeSingle();

    const payload = {
      id: prev?.id ?? body.rid,
      uuid: body.rid,
      name: body.name,
      email: body.email,
      company_name: body.companyName ?? null,
      company_size: body.companySize ?? prev?.company_size ?? null,
      industry: body.industry ?? prev?.industry ?? null,
      age_range: body.ageRange ?? prev?.age_range ?? null,
      is_consult_request: true, // 申込有りフラグ（命名は現行に合わせる）
      updated_at: new Date().toISOString(),
    };

    await admin.from("samurairesults").upsert(payload, { onConflict: "id" });
  } catch (e) {
    console.error("[report-request] upsert failed:", e);
    // 保存に失敗してもメール送信は継続（ユーザー体験優先）
  }

  // ---- メール送信（/report/{rid} の純リンク固定・UTM付与しない）
  const appBase =
    process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "") || "";
  const reportUrl = `${appBase}/report/${body.rid}`;

  // V2 テンプレに正しく渡す（文言・分岐はテンプレ側をそのまま使用）
  const mail = buildReportEmailV2({
    rid: body.rid,
    toName: body.name,            // 宛名（テンプレが toName を期待）
    companySize: body.companySize ?? undefined,
  });

  await sendMail({
    to: body.email,               // string で渡す
    subject: mail.subject,
    html: mail.html,
    text: mail.text,
  });

  return NextResponse.json({ ok: true });
}
