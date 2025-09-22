// app/api/report-request/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendMail } from "@/lib/mail";
import buildReportEmailV2 from "@/lib/emailTemplatesV2";

// Supabase 管理者クライアント
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const body = await req.json();

    // 必須項目チェック
    if (!body.rid || !body.email) {
      return NextResponse.json(
        { error: "rid と email は必須です" },
        { status: 400 }
      );
    }

    // samurairesults に upsert
    const payload = {
      id: body.rid, // ← rid を PK として利用
      name: body.name ?? null,
      email: body.email ?? null,
      company_name: body.company ?? null,
      company_size: body.companySize ?? null,
      industry: body.industry ?? null,
      age_range: body.ageBand ?? null,
      is_consult_request: false, // ここは詳細レポート申込なので false 固定
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabaseAdmin
      .from("samurairesults")
      .upsert(payload, { onConflict: "id" });

    if (error) {
      console.error("❌ supabase upsert error:", error);
      return NextResponse.json({ error: "DB保存に失敗しました" }, { status: 500 });
    }

    // レポートURLを生成
    const appBase =
      process.env.NEXT_PUBLIC_APP_URL?.replace(/\/+$/, "") || "";
    const reportUrl = `${appBase}/report/${body.rid}`;

    // 📧 メール送信
    const mail = buildReportEmailV2({
      rid: body.rid,
      toName: body.name,
      companySize: body.companySize ?? undefined,
    });

    await sendMail({
      to: body.email,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
    });

    return NextResponse.json({ ok: true, reportUrl });
  } catch (e) {
    console.error("❌ report-request route failed:", e);
    return NextResponse.json(
      { error: "サーバーエラーが発生しました" },
      { status: 500 }
    );
  }
}
