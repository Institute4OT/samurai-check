// app/api/report-request/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendMail } from "@/lib/mail";
import buildReportEmailV2 from "@/lib/emailTemplatesV2";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 文字正規化
function norm(v: unknown): string | undefined {
  if (v == null) return undefined;
  const s = String(v).replace(/\u3000/g, " ").trim();
  return s === "" ? undefined : s;
}

// ボディ吸収（snake/camel/旧名）
function pickAliases(src: Record<string, any>) {
  return {
    rid:          norm(src.rid) ?? norm(src.id),
    name:         norm(src.name),
    email:        norm(src.email),
    company_name: norm(src.company_name) ?? norm(src.company),
    company_size: norm(src.company_size) ?? norm(src.companySize),
    industry:     norm(src.industry)     ?? norm(src.sector),
    age_range:    norm(src.age_range)    ?? norm(src.ageBand),
  };
}

export async function POST(req: Request) {
  try {
    const raw = await req.json();
    const b = pickAliases(raw);
    if (!b.rid || !b.name || !b.email) {
      return NextResponse.json({ ok:false, error:"rid・name・email は必須です" }, { status: 400 });
    }

    // 1) 申込データを upsert（スコア系は触らない）
    const { error: upsertErr } = await supabaseAdmin
      .from("samurairesults")
      .upsert({
        id: b.rid,
        name: b.name,
        email: b.email,
        company_name: b.company_name ?? null,
        company_size: b.company_size ?? null,
        industry: b.industry ?? null,
        age_range: b.age_range ?? null,
        updated_at: new Date().toISOString(),
      }, { onConflict: "id" });
    if (upsertErr) {
      console.error("❌ upsert error:", upsertErr);
      return NextResponse.json({ ok:false, error:"DB保存に失敗しました" }, { status:500 });
    }

    // 2) ★バックフィル：samurairesults にスコア系が無ければ diagnoses から補充
    const [{ data: cur }, { data: diag }] = await Promise.all([
      supabaseAdmin.from("samurairesults")
        .select("score_pattern, normalized_scores, samurai_type")
        .eq("id", b.rid)
        .maybeSingle(),
      supabaseAdmin.from("diagnoses")
        .select("score_pattern, normalized_scores, samurai_type")
        .eq("id", b.rid)
        .maybeSingle(),
    ]);

    const patch: Record<string, any> = {};
    if ((!cur?.score_pattern)      && diag?.score_pattern)      patch.score_pattern      = diag.score_pattern;
    if ((!cur?.normalized_scores)  && diag?.normalized_scores)  patch.normalized_scores  = diag.normalized_scores;
    if ((!cur?.samurai_type)       && diag?.samurai_type)       patch.samurai_type       = diag.samurai_type;

    if (Object.keys(patch).length) {
      patch.updated_at = new Date().toISOString();
      const { error: fillErr } = await supabaseAdmin
        .from("samurairesults")
        .update(patch)
        .eq("id", b.rid);
      if (fillErr) console.error("⚠️ backfill error:", fillErr);
    }

    // 3) レポートURLは /report/{rid} 固定
    const base =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_BASE_URL ||
      process.env.NEXT_PUBLIC_SITE_URL || "";
    const reportUrl = `${base.replace(/\/+$/, "")}/report/${encodeURIComponent(b.rid)}`;

    // 4) メール作成・送信（テンプレの正しいキー名で）
    const mail = buildReportEmailV2({
      rid: b.rid,
      typeName: "タイプ判定中",
      toName: b.name,
      email: b.email,
      reportLink: reportUrl,
      companySize: b.company_size,
      shareLink: process.env.NEXT_PUBLIC_SHARE_URL ?? undefined,
      lineOcUrl:  process.env.NEXT_PUBLIC_LINE_OC_URL ?? undefined,
      consultLink: process.env.NEXT_PUBLIC_CONSULT_URL ?? undefined,
    });

    await sendMail({ to: b.email, subject: mail.subject, html: mail.html, text: mail.text });

    return NextResponse.json({ ok:true, reportUrl });
  } catch (e) {
    console.error("❌ report-request failed:", e);
    return NextResponse.json({ ok:false, error:"サーバーエラーが発生しました" }, { status:500 });
  }
}
