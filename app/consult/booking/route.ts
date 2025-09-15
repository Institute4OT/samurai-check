// app/consult/booking/route.ts
/* eslint-disable no-console */
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendMail } from "@/lib/mail";
import {
  renderConsultIntakeMailToUser,
  renderConsultIntakeMailToOps,
} from "@/lib/emailTemplates";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = ["hnd1"]; // Tokyo(羽田)

// ===== Types =====
type ConsultantKey = "ishijima" | "morigami" | "either";

type TopicKey =
  | "meeting" // 会議設計・合意形成
  | "delegation" // 権限委譲・リーダー育成
  | "relations" // 上下・部門の関係性
  | "engagement" // エンゲージメント
  | "career" // キャリアサポート
  | "execCoaching" // エグゼクティブコーチング
  | "brain" // 思考技術・創発風土
  | "culture" // 風土改善
  | "vision" // 理念・ビジョン
  | "other"; // 自由記入

type StylePref = "deep" | "speed" | "" | null | undefined;

// ===== Auto-assign rules =====
const ISHI_SET = new Set<TopicKey>([
  "meeting",
  "delegation",
  "execCoaching",
  "brain",
  "vision",
  "relations", // 関係性の是正をスピードで切る場合も
]);
const MORI_SET = new Set<TopicKey>(["engagement", "career", "culture", "relations"]);

function decideAssignee(themes: string[], style?: StylePref): ConsultantKey {
  const picked = Array.from(
    new Set((themes || []).map((s) => String(s).trim()).filter(Boolean) as TopicKey[]),
  );
  const ish = picked.some((k) => ISHI_SET.has(k));
  const mor = picked.some((k) => MORI_SET.has(k));
  if (ish && !mor) return "ishijima";
  if (!ish && mor) return "morigami";
  if (ish && mor) {
    if (style === "speed") return "ishijima";
    if (style === "deep") return "morigami";
  }
  return "ishijima";
}

// ===== Helpers =====
function spirUrlFor(key: ConsultantKey): string {
  const ish = (process.env.SPIR_ISHIJIMA_URL || process.env.NEXT_PUBLIC_SPIR_ISHIJIMA_URL || "").trim();
  const mor = (process.env.SPIR_MORIGAMI_URL || process.env.NEXT_PUBLIC_SPIR_MORIGAMI_URL || "").trim();
  if (key === "morigami" && mor) return mor;
  if (key === "ishijima" && ish) return ish;
  return "";
}

/** 担当別の予約URL（SPIR最優先 → NEXT_PUBLIC_BOOKING_URL → /consult） */
function makeConsultLink(req: Request, assigned: ConsultantKey, rid?: string | null, email?: string | null) {
  const url = new URL(req.url);
  const origin = `${url.protocol}//${url.host}`;
  const spir = spirUrlFor(assigned);
  const base =
    spir ||
    (process.env.NEXT_PUBLIC_BOOKING_URL || "").trim() ||
    `${origin}/consult`;

  try {
    const u = new URL(base, origin);
    if (rid) u.searchParams.set("rid", rid);
    if (email) u.searchParams.set("email", email);
    if (!u.searchParams.get("utm_source")) u.searchParams.set("utm_source", "email");
    if (!u.searchParams.get("utm_medium")) u.searchParams.set("utm_medium", "transactional");
    if (!u.searchParams.get("utm_campaign")) u.searchParams.set("utm_campaign", "consult_intake");
    if (!u.searchParams.get("utm_content")) u.searchParams.set("utm_content", "cta_consult");
    return u.toString();
  } catch {
    // base が相対などで URL 失敗した場合は最後に /consult を返す
    const fallback = new URL(`${origin}/consult`);
    if (rid) fallback.searchParams.set("rid", rid);
    if (email) fallback.searchParams.set("email", email || "");
    return fallback.toString();
  }
}

/** 三態対応読取（multipart / x-www-form-urlencoded / json） */
async function readBookingRequest(req: Request) {
  const ct = (req.headers.get("content-type") || "").toLowerCase();

  // multipart / urlencoded
  if (ct.includes("multipart/form-data") || ct.includes("application/x-www-form-urlencoded")) {
    if (typeof (req as any).formData === "function") {
      const fd: FormData = await (req as any).formData();
      const themes = (fd.getAll("themes") as FormDataEntryValue[])
        .map((v) => (typeof v === "string" ? v.trim() : v.name))
        .filter(Boolean);
      return {
        name: String(fd.get("name") ?? "").trim(),
        email: String(fd.get("email") ?? "").trim(),
        rid: String(fd.get("rid") ?? fd.get("resultId") ?? fd.get("id") ?? "").trim(),
        assigneePref: (String(fd.get("assigneePref") ?? "either").trim() || "either") as ConsultantKey,
        themes,
        note: (String(fd.get("note") ?? "").trim() || null) as string | null,
        companyName: (String(fd.get("companyName") ?? "").trim() || null) as string | null,
        companySize: (String(fd.get("companySize") ?? "").trim() || null) as string | null,
        industry: (String(fd.get("industry") ?? "").trim() || null) as string | null,
        ageRange: (String(fd.get("ageRange") ?? "").trim() || null) as string | null,
        style: (String(fd.get("style") ?? "").trim() || null) as StylePref,
      };
    } else {
      const text = await req.text();
      const p = new URLSearchParams(text);
      return {
        name: String(p.get("name") ?? "").trim(),
        email: String(p.get("email") ?? "").trim(),
        rid: String(p.get("rid") ?? p.get("resultId") ?? p.get("id") ?? "").trim(),
        assigneePref: (String(p.get("assigneePref") ?? "either").trim() || "either") as ConsultantKey,
        themes: p.getAll("themes").map((s) => String(s).trim()).filter(Boolean),
        note: (String(p.get("note") ?? "").trim() || null) as string | null,
        companyName: (String(p.get("companyName") ?? "").trim() || null) as string | null,
        companySize: (String(p.get("companySize") ?? "").trim() || null) as string | null,
        industry: (String(p.get("industry") ?? "").trim() || null) as string | null,
        ageRange: (String(p.get("ageRange") ?? "").trim() || null) as string | null,
        style: (String(p.get("style") ?? "").trim() || null) as StylePref,
      };
    }
  }

  // json
  if (ct.includes("application/json")) {
    const j = await req.json();
    const normArr = (xs: unknown) => (Array.isArray(xs) ? xs : xs ? [xs] : []).map((x) => String(x).trim()).filter(Boolean);
    return {
      name: String(j.name ?? "").trim(),
      email: String(j.email ?? "").trim(),
      rid: String(j.rid ?? j.resultId ?? j.id ?? "").trim(),
      assigneePref: (String(j.assigneePref ?? "either").trim() || "either") as ConsultantKey,
      themes: normArr(j.themes),
      note: (j.note ? String(j.note).trim() : "") || null,
      companyName: (j.companyName ? String(j.companyName).trim() : "") || null,
      companySize: (j.companySize ? String(j.companySize).trim() : "") || null,
      industry: (j.industry ? String(j.industry).trim() : "") || null,
      ageRange: (j.ageRange ? String(j.ageRange).trim() : "") || null,
      style: (j.style ? String(j.style).trim() : "") || null,
    };
  }

  // fallback
  return {
    name: "",
    email: "",
    rid: "",
    assigneePref: "either" as ConsultantKey,
    themes: [] as string[],
    note: null as string | null,
    companyName: null as string | null,
    companySize: null as string | null,
    industry: null as string | null,
    ageRange: null as string | null,
    style: null as StylePref,
  };
}

// ===== Handler =====
export async function POST(req: Request) {
  try {
    const body = await readBookingRequest(req);

    // 必須
    const name = body.name;
    const email = body.email;
    if (!name || !email) {
      return NextResponse.json({ ok: false, error: "missing name/email" }, { status: 400 });
    }

    // 任意
    const resultId = body.rid || null;
    const style: StylePref = (body.style ?? null) as StylePref;
    const assigneePref = body.assigneePref;
    const themes = body.themes || [];
    const note = body.note || null;
    let companyName = body.companyName || null;
    let companySize = body.companySize || null;
    let industry = body.industry || null;
    let ageRange = body.ageRange || null;

    // 担当決定
    const assigned: ConsultantKey = assigneePref === "either" ? decideAssignee(themes, style) : assigneePref;
    const assigneeForMail = assigned === "either" ? undefined : assigned;

    // DB保存（best-effort）
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
      if (url && key) {
        const admin = createClient(url, key, { auth: { persistSession: false } });

        // 既存データから不足分を補完
        if (resultId && (!companyName || !companySize || !industry || !ageRange)) {
          const { data: srow } = await admin
            .from("samurairesults")
            .select("company_name, company_size, industry, age_range")
            .eq("id", resultId)
            .maybeSingle();

          if (srow) {
            companyName ||= (srow as any).company_name ?? null;
            companySize ||= (srow as any).company_size ?? null;
            industry ||= (srow as any).industry ?? null;
            ageRange ||= (srow as any).age_range ?? null;
          }

          if (!companyName || !companySize || !industry || !ageRange) {
            const { data: ci } = await admin
              .from("consult_intake")
              .select("company_name, company_size, industry, age_range")
              .eq("result_id", resultId)
              .order("created_at", { ascending: false })
              .limit(1);
            if (ci?.[0]) {
              companyName ||= (ci[0] as any).company_name ?? null;
              companySize ||= (ci[0] as any).company_size ?? null;
              industry ||= (ci[0] as any).industry ?? null;
              ageRange ||= (ci[0] as any).age_range ?? null;
            }
          }
        }

        // consult_intake へ保存
        const intake: Record<string, any> = {
          result_id: resultId,
          email,
          name,
          company_name: companyName,
          company_size: companySize,
          industry,
          age_range: ageRange,
          themes: themes.length ? themes : null,
          note,
          style,
          assignee_pref: assigneePref,
          assigned,
        };
        await admin.from("consult_intake").insert(intake);

        // samurairesults パッチ（存在すれば）
        if (resultId) {
          const patch: Record<string, any> = {
            is_consult_request: true,
            email,
            name,
          };
          if (companyName !== null) patch.company_name = companyName;
          if (companySize !== null) patch.company_size = companySize;
          if (industry !== null) patch.industry = industry;
          if (ageRange !== null) patch.age_range = ageRange;
          await admin.from("samurairesults").update(patch).eq("id", resultId);
        }
      } else {
        console.warn("[consult/booking] no supabase env; skip DB save");
      }
    } catch (dbErr) {
      console.error("[consult/booking] supabase save skipped:", dbErr);
      // DB失敗でも進める
    }

    // 予約URL（担当別SPIR優先）
    const consultLink = makeConsultLink(req, assigned, resultId, email);

    // ===== メール送信 =====
    // 1) 申込者へ（予約URLつき・宛名に様）
    const userMail = (renderConsultIntakeMailToUser as unknown as (args: any) => any)({
      toName: name,
      toEmail: email,
      rid: resultId || undefined,
      company: companyName || undefined,
      note,
      assignee: assigneeForMail,
      consultLink, // ★ ここがSPIR直リンク
    });
    await sendMail({
      to: email,
      subject: userMail.subject,
      html: userMail.html,
      text: userMail.text,
      replyTo: process.env.MAIL_REPLY_TO || undefined,
      tagId: `consult:intake_user${resultId ? `:${resultId}` : ""}`,
    });

    // 2) 運用宛
    const opsMail = (renderConsultIntakeMailToOps as unknown as (args: any) => any)({
      toName: name,
      toEmail: email,
      rid: resultId || undefined,
      company: companyName || undefined,
      note,
      assignee: assigneeForMail,
    });
    await sendMail({
      to: (process.env.MAIL_TO_OPS || process.env.MAIL_TO_TEST || email).trim(),
      subject: opsMail.subject,
      html: `${opsMail.html}
<hr/>
<div style="font-size:12px;color:#666;line-height:1.7">
  <b>resultId:</b> ${resultId || "-"}<br/>
  <b>style:</b> ${style || "-"}<br/>
  <b>assigneePref:</b> ${assigneePref}<br/>
  <b>assigned:</b> ${assigned}<br/>
  <b>themes:</b> ${themes.join(", ") || "-"}<br/>
  <b>note:</b> ${note || "-"}
</div>`,
      text: opsMail.text,
      tagId: `consult:intake_ops${resultId ? `:${resultId}` : ""}`,
    });

    // 3) 返却（フロント即遷移用）
    return NextResponse.json({
      ok: true,
      assigned,
      bookingUrl: consultLink, // ★ フロントでもこのURLに遷移
      rid: resultId,
    });
  } catch (e: any) {
    console.error("[api/consult/booking] failed:", e);
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}

// GETは許可しない（フォームPOST専用）
export async function GET() {
  return NextResponse.json({ ok: false, error: "method_not_allowed" }, { status: 405 });
}
