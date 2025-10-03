// app/api/report-request/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { sendMail } from "@/lib/mail";
import { buildReportEmailV2 } from "@/lib/emailTemplates";

const schema = z.object({
  rid: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
  company_name: z.string().optional().nullable(),
  company_size: z.string().min(1),
  industry: z.string().min(1),
  age_group: z.string().min(1),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = schema.safeParse(body);

    if (!parsed.success) {
      console.error("❌ Validation failed:", parsed.error.flatten());
      return NextResponse.json({ error: "Invalid form data" }, { status: 400 });
    }

    const {
      rid,
      name,
      email,
      company_name,
      company_size,
      industry,
      age_group,
    } = parsed.data;

    const supabase = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.SUPABASE_SERVICE_ROLE_KEY!
    );

    // 念のため rid が正しい uuid 文字列か検査
    if (!rid || typeof rid !== "string" || !rid.match(/^[0-9a-fA-F-]{36}$/)) {
      console.error("❌ Invalid RID format:", rid);
      return NextResponse.json({ error: "Invalid RID format" }, { status: 400 });
    }

    // 対象レコードが存在するかチェック（ここで null なら先にエラーを返す）
    const { data: rows, error: selectError } = await supabase
      .from("samurairesults")
      .select("id")
      .eq("id", rid);

    if (selectError) {
      console.error("❌ Supabase select error:", selectError);
      return NextResponse.json({ error: "Failed to fetch record" }, { status: 500 });
    }

    if (!rows || rows.length === 0) {
      console.error("❌ No record found for RID:", rid);
      return NextResponse.json({ error: "RID not found" }, { status: 404 });
    }

    const { error: updateError } = await supabase
      .from("samurairesults")
      .update({
        name,
        email,
        company_name,
        company_size,
        industry,
        age_group,
      })
      .eq("id", rid);

    if (updateError) {
      console.error("❌ Supabase update error:", updateError);
      return NextResponse.json({ error: "Failed to update data" }, { status: 500 });
    }

    const mail = buildReportEmailV2({
      rid,
      toName: name,
      email,
      companySize: company_size,
    });

    await sendMail({
      to: email,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      replyTo: process.env.MAIL_REPLY_TO,
      tagId: "report-request",
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("❌ Unexpected server error:", err);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
