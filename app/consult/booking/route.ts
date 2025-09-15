// app/consult/booking/route.ts
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { sendMail } from "@/lib/mail";
import {
  renderConsultIntakeMailToUser,
  renderConsultIntakeMailToOps,
  // bookingUrlFor は使わずローカル生成に切替（型衝突を避ける）
} from "@/lib/emailTemplates";

// env の存在チェック（ローカル関数）
function needEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`[consult/booking] missing env: ${name}`);
  return v;
}

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = ["hnd1"]; // Tokyo(羽田)

// ===== Types =====
// ※ emailTemplates 側の Consultant と衝突しない自前のキー型
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

// ===== 自動割当（either のときだけ使用） =====
const ISHI_SET = new Set<TopicKey>([
  "meeting",
  "relations",
  "brain",
  "delegation",
  "execCoaching",
]);
const MORI_SET = new Set<TopicKey>(["engagement", "career", "culture"]);
// vision は中立（どちらでも可）

function autoAssign(themes: string[]): ConsultantKey {
  const picked = Array.from(
    new Set(
      (themes || []).map((s) => String(s).trim()).filter(Boolean) as TopicKey[],
    ),
  );
  if (picked.some((k) => MORI_SET.has(k))) return "morigami";
  if (picked.some((k) => ISHI_SET.has(k))) return "ishijima";
  return "ishijima"; // デフォルト
}

/** 予約URL（rid/email クエリ付与）をローカルで生成 */
function makeBookingUrl(req: Request, rid?: string | null, email?: string) {
  const url = new URL(req.url);
  const origin = `${url.protocol}//${url.host}`;
  const base = (
    process.env.NEXT_PUBLIC_BOOKING_BASE_URL || `${origin}/consult`
  ).trim();
  const qs = new URLSearchParams();
  if (rid) qs.set("rid", rid);
  if (email) qs.set("email", email);
  return qs.toString() ? `${base}?${qs.toString()}` : base;
}

/* ===========================================================
   受信ボディの読取を JSON / x-www-form-urlencoded / multipart
   の三態で吸収するヘルパー
   =========================================================== */
async function readBookingRequest(req: Request) {
  const ct = (req.headers.get("content-type") || "").toLowerCase();
  const normalizeThemes = (xs: unknown) =>
    (Array.isArray(xs) ? xs : xs ? [xs] : [])
      .map((x) => String(x).trim())
      .filter(Boolean);

  // 1) multipart / x-www-form-urlencoded（formData が無い環境もある）
  if (
    ct.includes("multipart/form-data") ||
    ct.includes("application/x-www-form-urlencoded")
  ) {
    if (typeof (req as any).formData === "function") {
      // ★ fd を FormData で型付け
      const fd: FormData = await (req as any).formData();
      return {
        name: String(fd.get("name") ?? "").trim(),
        email: String(fd.get("email") ?? "").trim(),
        rid: String(
          fd.get("rid") ?? fd.get("resultId") ?? fd.get("id") ?? "",
        ).trim(),
        assigneePref: (String(fd.get("assigneePref") ?? "either").trim() ||
          "either") as ConsultantKey,
        // ★ v: FormDataEntryValue を明示（string or File）
        themes: (fd.getAll("themes") as FormDataEntryValue[])
          .map((v: FormDataEntryValue) =>
            typeof v === "string" ? v.trim() : v.name,
          )
          .filter(Boolean),
        note: (String(fd.get("note") ?? "").trim() || null) as string | null,
        companyName: (String(fd.get("companyName") ?? "").trim() || null) as
          | string
          | null,
        companySize: (String(fd.get("companySize") ?? "").trim() || null) as
          | string
          | null,
        industry: (String(fd.get("industry") ?? "").trim() || null) as
          | string
          | null,
        ageRange: (String(fd.get("ageRange") ?? "").trim() || null) as
          | string
          | null,
        style: (String(fd.get("style") ?? "").trim() || null) as string | null,
      };
    } else {
      //  …（urlencoded フォールバックはそのままでOK）
      const text = await req.text();
      const p = new URLSearchParams(text);
      return {
        name: String(p.get("name") ?? "").trim(),
        email: String(p.get("email") ?? "").trim(),
        rid: String(
          p.get("rid") ?? p.get("resultId") ?? p.get("id") ?? "",
        ).trim(),
        assigneePref: (String(p.get("assigneePref") ?? "either").trim() ||
          "either") as ConsultantKey,
        themes: p
          .getAll("themes")
          .map((s) => String(s).trim())
          .filter(Boolean),
        note: (String(p.get("note") ?? "").trim() || null) as string | null,
        companyName: (String(p.get("companyName") ?? "").trim() || null) as
          | string
          | null,
        companySize: (String(p.get("companySize") ?? "").trim() || null) as
          | string
          | null,
        industry: (String(p.get("industry") ?? "").trim() || null) as
          | string
          | null,
        ageRange: (String(p.get("ageRange") ?? "").trim() || null) as
          | string
          | null,
        style: (String(p.get("style") ?? "").trim() || null) as string | null,
      };
    }
  }

  // 2) application/json（一番扱いやすい）
  if (ct.includes("application/json")) {
    const j = await req.json();
    return {
      name: String(j.name ?? "").trim(),
      email: String(j.email ?? "").trim(),
      rid: String(j.rid ?? j.resultId ?? j.id ?? "").trim(),
      assigneePref: (String(j.assigneePref ?? "either").trim() ||
        "either") as ConsultantKey,
      themes: normalizeThemes(j.themes),
      note: (j.note ? String(j.note).trim() : "") || null,
      companyName: (j.companyName ? String(j.companyName).trim() : "") || null,
      companySize: (j.companySize ? String(j.companySize).trim() : "") || null,
      industry: (j.industry ? String(j.industry).trim() : "") || null,
      ageRange: (j.ageRange ? String(j.ageRange).trim() : "") || null,
      style: (j.style ? String(j.style).trim() : "") || null,
    };
  }

  // 未対応CTは空を返す（後段で400判定）
  return {
    name: "",
    email: "",
    rid: "",
    assigneePref: "either" as ConsultantKey,
    themes: [] as string[],
    note: null,
    companyName: null,
    companySize: null,
    industry: null,
    ageRange: null,
    style: null,
  };
}

// ====== Handler ======
export async function POST(req: Request) {
  try {
    // ★ ここを三態対応の読取に置き換え
    const body = await readBookingRequest(req);

    // --- 必須 ---
    const name = body.name;
    const email = body.email;
    if (!name || !email) {
      return NextResponse.json(
        { ok: false, error: "missing name/email" },
        { status: 400 },
      );
    }

    // --- 任意（hidden 推奨含む） ---
    const resultId = body.rid;
    const style = body.style;
    const assigneePref = body.assigneePref;
    const themes = body.themes;
    const note = body.note;

    // 申込者が任意で入れた可能性（今はフォームに出していない想定）
    let companyName = body.companyName;
    let companySize = body.companySize;
    let industry = body.industry;
    let ageRange = body.ageRange;

    // either のときだけ自動割当
    const assigned: ConsultantKey =
      assigneePref === "either" ? autoAssign(themes) : assigneePref;

    // メールテンプレ側に渡す値（型注釈は付けない＝衝突を避ける）
    const consultantForMail = assigned === "either" ? undefined : assigned;

    // ====== DB 保存（best-effort） ======
    try {
      const admin = createClient(
        needEnv("NEXT_PUBLIC_SUPABASE_URL"),
        needEnv("SUPABASE_SERVICE_ROLE_KEY"),
        { auth: { persistSession: false } },
      );

      // --- 足りない会社情報は DB から補完（samurairesults -> consult_intake 最新） ---
      if (
        resultId &&
        (!companyName || !companySize || !industry || !ageRange)
      ) {
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

      // consult_intake に保存（存在するカラムだけ使う/ nullも許容）
      const intake: Record<string, any> = {
        result_id: resultId || null,
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
        assigned, // 実際に割り当てた担当
      };
      await admin.from("consult_intake").insert(intake);

      // samurairesults にも補完（存在すれば）— null で上書きしないように注意
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
    } catch (dbErr) {
      console.error("[consult/booking] supabase save skipped:", dbErr);
      // DB失敗でもメール送信とレスポンスは継続
    }

    // ====== メール送信 ======

    // 1) 申込者へ（予約URLつき）
    const userMail = (
      renderConsultIntakeMailToUser as unknown as (args: any) => any
    )({
      name,
      consultant: consultantForMail,
      resultId: resultId || undefined,
      email,
    });
    await sendMail({
      to: email,
      subject: userMail.subject,
      html: userMail.html,
      text: userMail.text,
    });

    // 2) 運用通知（補足を末尾に添付）— RID を必ず明記
    const opsMail = (
      renderConsultIntakeMailToOps as unknown as (args: any) => any
    )({
      email,
      name,
      companyName: companyName || undefined,
      companySize: (companySize || "1-10") as any,
      industry: (industry || "その他") as any,
      resultId: resultId || undefined,
    });
    await sendMail({
      to: (process.env.MAIL_TO_OPS || "info@ourdx-mtg.com").trim(),
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
    });

    // 3) 画面側へ返却（即リダイレクト用 URL も同梱）— RID も返す
    const bookingUrl = makeBookingUrl(req, resultId || null, email);
    return NextResponse.json({
      ok: true,
      assigned,
      bookingUrl,
      rid: resultId || null,
    });
  } catch (e: any) {
    console.error("[api/consult/booking] failed:", e);
    return NextResponse.json(
      { ok: false, error: e?.message || String(e) },
      { status: 500 },
    );
  }
}

// GET等は許可しない（フォームPOST専用）
export async function GET() {
  return NextResponse.json(
    { ok: false, error: "method_not_allowed" },
    { status: 405 },
  );
}
