// app/api/consult-request/route.ts
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendMail } from "@/lib/mail";
import {
  renderConsultIntakeMailToUser,
  renderConsultIntakeMailToOps,
  buildConsultEmail,
} from "@/lib/emailTemplates";
import { createClient } from "@supabase/supabase-js";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";
export const preferredRegion = "hnd1";

// --- utils ---
function ensureSama(name?: string | null) {
  const n = (name ?? "").trim();
  if (!n) return "ご担当者様";
  return /様$/.test(n) ? n : `${n} 様`;
}
function addUtm(url: string, content: string, rid?: string, email?: string) {
  try {
    const u = new URL(url);
    u.searchParams.set("utm_source", "email");
    u.searchParams.set("utm_medium", "transactional");
    u.searchParams.set("utm_campaign", "consult_intake");
    u.searchParams.set("utm_content", content);
    if (rid) u.searchParams.set("utm_id", rid);
    if (email) u.searchParams.set("email", email);
    return u.toString();
  } catch {
    return url;
  }
}
function bucket(size?: string | null) {
  if (!size) return "small";
  const s = String(size).trim().replace(/[〜～~–—－]/g, "-").replace(/名/g, "");
  const p = s.match(/(\d+)\s*(\+|以上)$/);
  if (p) return Number(p[1]) >= 51 ? "large" : "small";
  const le = s.match(/(\d+)\s*以下$/);
  if (le) return Number(le[1]) <= 50 ? "small" : "large";
  const m = s.match(/(\d+)\s*-\s*(\d+)/);
  if (m) return Number(m[2]) <= 50 ? "small" : "large";
  if (/^(1-10|11-50)$/.test(s)) return "small";
  if (/^(51-100|101-300|301-1000|1001.*)$/.test(s)) return "large";
  return "small";
}

// --- consultant routing ---
type Topic =
  | "meeting"
  | "delegation"
  | "relations"
  | "engagement"
  | "career"
  | "execCoaching"
  | "brain"
  | "culture"
  | "vision"
  | "other";
type Style = "deep" | "speed";
type Assignee = "ishijima" | "morigami";

const ISHI: Topic[] = ["meeting", "delegation", "execCoaching", "brain", "vision"];
const MORI: Topic[] = ["relations", "engagement", "career", "culture"];
function decideAssignee(topics: Topic[] = [], style?: Style): Assignee {
  const set = new Set(topics);
  const ish = ISHI.some((t) => set.has(t));
  const mor = MORI.some((t) => set.has(t));
  if (ish && !mor) return "ishijima";
  if (!ish && mor) return "morigami";
  if (ish && mor) {
    if (style === "speed") return "ishijima";
    if (style === "deep") return "morigami";
  }
  return "ishijima";
}

export async function POST(req: NextRequest) {
  try {
    const raw = await req.json().catch(() => null);
    if (!raw) {
      return NextResponse.json({ ok: false, error: "invalid json" }, { status: 400 });
    }

    const Schema = z.object({
      email: z.string().email(),
      name: z.string().trim().optional(),
      company: z.string().trim().optional(),
      note: z.string().optional(),
      rid: z.string().optional(),
      topics: z.array(z.string()).optional(), // Topic[]
      style: z.enum(["deep", "speed"]).optional(),
      companySize: z.string().optional(),
      dry: z.boolean().optional(),
    });
    const parsed = Schema.safeParse(raw);
    if (!parsed.success) {
      return NextResponse.json({ ok: false, error: parsed.error.flatten() }, { status: 400 });
    }

    const { email, name, company, note, rid, topics, style, companySize, dry } = parsed.data;

    // 50名以下ガード（rid→supabase 参照できる場合のみ）
    try {
      const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
      const key = process.env.SUPABASE_SERVICE_ROLE_KEY!;
      if (rid && url && key) {
        const supa = createClient(url, key);
        const { data } = await supa
          .from("report_requests")
          .select("company_size")
          .eq("rid", rid)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        const sizeSrc = data?.company_size || companySize;
        if (bucket(sizeSrc) === "small") {
          return NextResponse.json(
            { ok: false, error: "eligible_only_51plus" },
            { status: 403 },
          );
        }
      }
    } catch {
      // 失敗してもブロックはせず続行（運用優先）
    }

    // 担当振り分け
    const assignee = decideAssignee((topics as Topic[]) || [], style as Style | undefined);

    // 予約（Spir）URL
    const spirBase =
      assignee === "morigami"
        ? (process.env.SPIR_MORIGAMI_URL || process.env.NEXT_PUBLIC_SPIR_MORIGAMI_URL || "").trim()
        : (process.env.SPIR_ISHIJIMA_URL || process.env.NEXT_PUBLIC_SPIR_ISHIJIMA_URL || "").trim();

    const consultLink = spirBase
      ? addUtm(
          rid
            ? `${spirBase}${spirBase.includes("?") ? "&" : "?"}rid=${encodeURIComponent(rid)}`
            : spirBase,
          "cta_consult",
          rid,
          email,
        )
      : addUtm(`${process.env.NEXT_PUBLIC_APP_URL || ""}/consult`, "cta_consult", rid, email);

    // テンプレに渡す共通引数
    const args = {
      toEmail: email,
      toName: ensureSama(name),
      company,
      note,
      rid,
      consultLink,
      assignee, // for ops template
    };

    const userMail = renderConsultIntakeMailToUser(args as any) as any;
    const opsMail = renderConsultIntakeMailToOps(args as any) as any;

    // ご案内メール（予約導線付き）
    const guide = buildConsultEmail(args as any) as any;
    const guideUser = (guide?.user ?? {}) as { subject?: string; html?: string; text?: string };

    if (!dry) {
      await Promise.all([
        sendMail({
          to: email,
          subject: userMail.subject,
          html: userMail.html,
          text: userMail.text,
          replyTo: process.env.MAIL_REPLY_TO || undefined,
          tagId: `consult:intake_user${rid ? `:${rid}` : ""}`,
        }),
        sendMail({
          to: process.env.MAIL_TO_OPS || process.env.MAIL_TO_TEST || email,
          subject: opsMail.subject,
          html: opsMail.html,
          text: opsMail.text,
          tagId: `consult:intake_ops${rid ? `:${rid}` : ""}`,
        }),
        sendMail({
          to: email,
          subject: guideUser.subject || "【武将タイプ診断アプリ】▶ 無料個別相談のご案内",
          html: guideUser.html || userMail.html,
          text: guideUser.text || userMail.text,
          replyTo: process.env.MAIL_REPLY_TO || undefined,
          tagId: `consult:guide${rid ? `:${rid}` : ""}`,
        }),
      ]);
    }

    return NextResponse.json({ ok: true, assignee, dry: !!dry, consultLink });
  } catch (e: any) {
    console.error("[api/consult-request] error:", e);
    return NextResponse.json({ ok: false, error: e?.message ?? String(e) }, { status: 400 });
  }
}
