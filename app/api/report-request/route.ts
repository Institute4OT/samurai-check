// app/api/report-request/route.ts
import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { sendMail } from "@/lib/mail"; // 既存の送信関数を使用

// ===== Schema =====
const BodySchema = z.object({
  rid: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
  company_size: z.union([z.string(), z.number()]),
  industry: z.string().optional().nullable(),
  age_range: z.string().optional().nullable(),
});

function mustEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

// ===== メール本文（テンプレ依存を排除してここで生成）=====
function makeUserMail(params: { to: string; name: string }) {
  const subject = "【IOT】詳細レポート申込を受け付けました";
  const html = `
    <div style="font-family:system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; line-height:1.7;">
      <p>${params.name} 様</p>
      <p>一般社団法人 企業の未来づくり研究所です。<br/>
      詳細レポートのお申込み、ありがとうございます。順次作成してお送りします。</p>
      <p>本メールは自動送信です。お心当たりがない場合は、恐れ入りますが本メールを破棄してください。</p>
      <hr/>
      <p style="font-size:12px;color:#666;">© Institute for Our Transformation</p>
    </div>
  `;
  return { to: params.to, subject, html };
}

function makeOpsMail(params: {
  rid: string; name: string; email: string;
  company_size: string; industry?: string | null; age_range?: string | null;
}) {
  const subject = `【IOT/通知】詳細レポート申込: ${params.name} (${params.email})`;
  const html = `
    <div style="font-family:system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif; line-height:1.7;">
      <h3>詳細レポート申込 受付</h3>
      <ul>
        <li>rid: ${params.rid}</li>
        <li>氏名: ${params.name}</li>
        <li>メール: ${params.email}</li>
        <li>会社規模: ${params.company_size}</li>
        <li>業種: ${params.industry ?? ""}</li>
        <li>年齢帯: ${params.age_range ?? ""}</li>
      </ul>
    </div>
  `;
  const to = process.env.MAIL_OPS_TO || ""; // 環境変数未設定なら後段でスキップ
  return { to, subject, html };
}

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const body = BodySchema.parse(json);

    const supabase = createClient(
      mustEnv("NEXT_PUBLIC_SUPABASE_URL"),
      mustEnv("SUPABASE_SERVICE_ROLE_KEY")
    );

    // samurairesults を更新
    const { error: upErr } = await supabase
      .from("samurairesults")
      .update({
        name: body.name,
        email: body.email,
        company_size: body.company_size,
        industry: body.industry ?? null,
        age_range: body.age_range ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", body.rid);

    if (upErr) {
      console.error("[report-request] update error:", upErr);
      return NextResponse.json({ ok: false, message: "DB update failed" }, { status: 500 });
    }

    // ユーザー宛
    try {
      const msgUser = makeUserMail({ to: body.email, name: body.name });
      await sendMail(msgUser as any);
    } catch (e) {
      console.warn("[report-request] user mail failed:", e);
      // 失敗してもUX優先で継続
    }

    // 運用宛（MAIL_OPS_TO が無ければ送信スキップ）
    try {
      const opsTo = process.env.MAIL_OPS_TO;
      if (opsTo) {
        const msgOps = makeOpsMail({
          rid: body.rid,
          name: body.name,
          email: body.email,
          company_size: String(body.company_size),
          industry: body.industry ?? null,
          age_range: body.age_range ?? null,
        });
        await sendMail(msgOps as any);
      }
    } catch (e) {
      console.warn("[report-request] ops mail failed:", e);
    }

    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error("[report-request] fatal:", e);
    return NextResponse.json({ ok: false, message: e?.message ?? "Bad Request" }, { status: 400 });
  }
}
