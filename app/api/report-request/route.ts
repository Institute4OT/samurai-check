// app/api/report-request/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendMail } from "@/lib/mail";
import buildReportEmailV2 from "@/lib/emailTemplatesV2";

// Supabase admin client（server only）
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

// 値の正規化（前後空白や全角スペース除去）
function norm(v: unknown): string | undefined {
  if (v == null) return undefined;
  const s = String(v).replace(/\u3000/g, " ").trim();
  return s === "" ? undefined : s;
}

// スネーク／キャメル／旧名のエイリアスを吸収
function pickAliases<T extends Record<string, any>>(src: T) {
  return {
    rid: norm(src.rid) ?? norm(src.id), // 念のため
    name: norm(src.name),
    email: norm(src.email),

    // ここが重要：両方（+旧名）を見る
    company_name:
      norm(src.company_name) ?? norm(src.company) ?? undefined,
    company_size:
      norm(src.company_size) ?? norm(src.companySize) ?? undefined,
    industry:
      norm(src.industry) ?? norm(src.sector) ?? undefined,
    age_range:
      norm(src.age_range) ?? norm(src.ageBand) ?? undefined,
  };
}

export async function POST(req: Request) {
  try {
    const raw = await req.json();
    const b = pickAliases(raw);

    if (!b.rid || !b.email || !b.name) {
      return NextResponse.json(
        { ok: false, error: "rid・name・email は必須です" },
        { status: 400 }
      );
    }

    // 1) DB保存：samurairesults に rid 主キーで upsert
    const { error: upsertErr } = await supabaseAdmin
      .from("samurairesults")
      .upsert(
        {
          id: b.rid,
          name: b.name,
          email: b.email,
          company_name: b.company_name ?? null,
          company_size: b.company_size ?? null,
          industry: b.industry ?? null,
          age_range: b.age_range ?? null,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "id" }
      );

    if (upsertErr) {
      console.error("❌ supabase upsert error:", upsertErr);
      return NextResponse.json(
        { ok: false, error: "DB保存に失敗しました" },
        { status: 500 }
      );
    }

    // 2) レポートURLは /report/{rid} に固定（余計なクエリは付けない）
    const base =
      process.env.NEXT_PUBLIC_APP_URL ||
      process.env.NEXT_PUBLIC_BASE_URL ||
      process.env.NEXT_PUBLIC_SITE_URL ||
      "";
    const reportUrl = `${base.replace(/\/+$/, "")}/report/${encodeURIComponent(
      b.rid
    )}`;

    // 3) メール生成：テンプレの“正しい”キー名で渡す
    const mail = buildReportEmailV2({
      rid: b.rid,
      typeName: "タイプ判定中",
      toName: b.name,
      email: b.email,                 // ← toEmail ではない
      reportLink: reportUrl,          // ← そのまま使わせる（テンプレ側はUTMのみ付与）
      companySize: b.company_size,    // ← undefined を許容（nullは渡さない）
      shareLink: process.env.NEXT_PUBLIC_SHARE_URL ?? undefined,
      lineOcUrl: process.env.NEXT_PUBLIC_LINE_OC_URL ?? undefined,
      consultLink: process.env.NEXT_PUBLIC_CONSULT_URL ?? undefined,
    });

    // 4) 送信
    await sendMail({
      to: b.email,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    });

    return NextResponse.json({ ok: true, reportUrl });
  } catch (e) {
    console.error("❌ report-request route failed:", e);
    return NextResponse.json(
      { ok: false, error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
