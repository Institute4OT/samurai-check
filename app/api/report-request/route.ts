// app/api/report-request/route.ts（相談フォームURLに ?rid= を付与した以外は前回版と同じ）
import { NextResponse } from "next/server";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { sendMail } from "@/lib/mail";

const BodySchema = z.object({
  rid: z.string().uuid(),
  name: z.string().min(1),
  email: z.string().email(),
  company_size: z.union([z.string(), z.number()]),
  company_name: z.string().optional().nullable(),
  industry: z.string().optional().nullable(),
  age_range: z.string().optional().nullable(),
});

function mustEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

function getSiteOrigin(req: Request) {
  const env = process.env.NEXT_PUBLIC_SITE_URL;
  if (env && /^https?:\/\//i.test(env)) return env.replace(/\/+$/, "");
  return new URL(req.url).origin;
}
function getSpirUrl(c?: string | null) {
  if (c === "ishijima") return process.env.NEXT_PUBLIC_SPIR_ISHIJIMA_URL || "";
  if (c === "morigami") return process.env.NEXT_PUBLIC_SPIR_MORIGAMI_URL || "";
  return "";
}
function counselorLabel(c?: string | null) {
  if (c === "ishijima") return "石島（SACHIKO）";
  if (c === "morigami") return "森上";
  return "担当未確定";
}
function buttonHtml(href: string, label: string) {
  const safeHref = href || "#";
  return `<a href="${safeHref}" target="_blank" rel="noopener"
    style="display:inline-block;padding:12px 18px;background:#111;color:#fff;border-radius:8px;text-decoration:none;font-weight:600;">
    ${label}</a>`;
}
function makeUserMail(params: {
  to: string; name: string; reportUrl: string;
  counselor?: string | null; spirUrl?: string; fallbackConsultUrl: string;
  company_size?: string; company_name?: string | null; industry?: string | null; age_range?: string | null;
}) {
  const subject = "【IOT】詳細レポートURLのご案内／無料個別相談について";
  const consultBtn = params.spirUrl
    ? buttonHtml(params.spirUrl!, `無料個別相談を予約（${counselorLabel(params.counselor)}）`)
    : buttonHtml(params.fallbackConsultUrl, "まずは相談内容を送る");
  const reportBtn = buttonHtml(params.reportUrl, "詳細レポートを開く");
  const html = `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.8;">
    <p>${params.name} 様</p>
    <p>一般社団法人 <strong>企業の未来づくり研究所</strong>です。<br/>
       詳細レポートのお申込みありがとうございます。以下のボタンからいつでもレポートにアクセスできます。</p>
    <div style="margin:16px 0;">${reportBtn}</div>
    <h3 style="margin-top:24px;margin-bottom:8px;">無料個別相談（30分）</h3>
    <p>レポート内容をもとに、今後の進め方をご一緒に整理します。</p>
    <div style="margin:8px 0 16px 0;">${consultBtn}</div>
    <hr style="border:none;border-top:1px solid #eee;margin:24px 0;" />
    <p style="font-size:13px;color:#666;margin:0 0 6px;">申込内容（控え）</p>
    <ul style="font-size:13px;color:#666;margin:0;padding-left:18px;">
      <li>会社名：${params.company_name ?? ""}</li>
      <li>会社規模：${params.company_size ?? ""}</li>
      <li>業種：${params.industry ?? ""}</li>
      <li>年齢帯：${params.age_range ?? ""}</li>
      <li>担当：${counselorLabel(params.counselor)}</li>
    </ul>
    <p style="font-size:12px;color:#888;margin-top:24px;">
      ※本メールは自動送信です。お心当たりがない場合は破棄してください。<br/>
      © Institute for Our Transformation
    </p>
  </div>`;
  return { to: params.to, subject, html };
}
function makeOpsMail(params: {
  rid: string; name: string; email: string; reportUrl: string;
  company_size?: string; company_name?: string | null; industry?: string | null; age_range?: string | null;
  counselor?: string | null; spirUrl?: string; fallbackConsultUrl: string;
}) {
  const subject = `【IOT/通知】詳細レポート申込: ${params.name} (${params.email})`;
  const html = `
  <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Helvetica,Arial,sans-serif;line-height:1.8;">
    <h3>詳細レポート申込 受付</h3>
    <ul>
      <li>rid: ${params.rid}</li>
      <li>氏名: ${params.name}</li>
      <li>メール: ${params.email}</li>
      <li>会社名: ${params.company_name ?? ""}</li>
      <li>会社規模: ${params.company_size ?? ""}</li>
      <li>業種: ${params.industry ?? ""}</li>
      <li>年齢帯: ${params.age_range ?? ""}</li>
      <li>担当: ${counselorLabel(params.counselor)}</li>
    </ul>
    <p>レポートURL：<a href="${params.reportUrl}" target="_blank" rel="noopener">${params.reportUrl}</a></p>
    <p>相談URL：<a href="${params.spirUrl || params.fallbackConsultUrl}" target="_blank" rel="noopener">
      ${params.spirUrl || params.fallbackConsultUrl}
    </a></p>
  </div>`;
  const to = process.env.MAIL_OPS_TO || "";
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

    const { error: upErr } = await supabase
      .from("samurairesults")
      .update({
        name: body.name,
        email: body.email,
        company_size: body.company_size,
        company_name: body.company_name ?? null,
        industry: body.industry ?? null,
        age_range: body.age_range ?? null,
        updated_at: new Date().toISOString(),
      })
      .eq("id", body.rid);

    if (upErr) {
      console.error("[report-request] update error:", upErr);
      return NextResponse.json({ ok: false, message: "DB update failed" }, { status: 500 });
    }

    const { data: row } = await supabase
      .from("samurairesults")
      .select("assigned_counselor")
      .eq("id", body.rid)
      .single<{ assigned_counselor: "ishijima" | "morigami" | null }>();

    const origin = getSiteOrigin(req);
    const reportUrl = `${origin}/report?rid=${body.rid}`;
    const counselor = row?.assigned_counselor ?? null;
    const spirUrl = getSpirUrl(counselor);
    // ★ 相談フォームへ rid を付与
    const fallbackConsultUrl = `${origin}/consult/start?rid=${body.rid}`;

    try {
      const msgUser = makeUserMail({
        to: body.email,
        name: body.name,
        reportUrl,
        counselor,
        spirUrl,
        fallbackConsultUrl,
        company_size: String(body.company_size),
        company_name: body.company_name ?? null,
        industry: body.industry ?? null,
        age_range: body.age_range ?? null,
      });
      await sendMail(msgUser as any);
    } catch (e) {
      console.warn("[report-request] user mail failed:", e);
    }

    try {
      const opsTo = process.env.MAIL_OPS_TO;
      if (opsTo) {
        const msgOps = makeOpsMail({
          rid: body.rid,
          name: body.name,
          email: body.email,
          reportUrl,
          counselor,
          spirUrl,
          fallbackConsultUrl,
          company_size: String(body.company_size),
          company_name: body.company_name ?? null,
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
