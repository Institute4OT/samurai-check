// app/report/[rid]/page.tsx
import { redirect, notFound } from "next/navigation";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import ReportTemplate from "@/components/report/ReportTemplate";
import {
  type NormalizedCategoryScores,
  type SamuraiType,
  type ScorePattern,
  type QuestionId,
} from "@/types/diagnosis";
import { judgeSamurai } from "@/lib/samuraiJudge";
import { TYPE_CONTENTS } from "@/lib/report/typeContents";
import { getPersonalizedComments } from "@/lib/report/personalization";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// ---------------- Util ----------------
const Rid = z.string().uuid();
type Row = Record<string, any>;
const TABLES = ["diagnoses", "samurairesults", "samurai_results", "samurairesult", "results"] as const;

function first<T>(...vals: (T | null | undefined)[]) {
  for (const v of vals) if (v != null) return v as T;
  return undefined;
}

// harassment の表記ゆれを吸収
function ensureHarassmentAliases<T extends Record<string, any>>(scores: T) {
  const v =
    Number.isFinite(scores["harassmentAwareness"]) ? scores["harassmentAwareness"] :
    Number(scores["無自覚ハラ傾向"] ?? scores["harassment_awareness"] ?? 0);

  const r =
    Number.isFinite(scores["harassmentRisk"]) ? scores["harassmentRisk"] :
    Number(scores["無自覚ハラスメント傾向"] ?? scores["harassment_risk"] ?? v ?? 0);

  return { ...scores, harassmentAwareness: v, harassmentRisk: r } as T & {
    harassmentAwareness: number; harassmentRisk: number;
  };
}

function coerceScores(src: any): NormalizedCategoryScores | null {
  if (!src) return null;

  if (Array.isArray(src) && src.length >= 6) {
    const n = (i: number) => Number(src[i] ?? 0);
    return {
      delegation: n(0),
      orgDrag: n(1),
      commGap: n(2),
      updatePower: n(3),
      genGap: n(4),
      harassmentAwareness: n(5),
    };
  }

  const o = typeof src === "object" ? (src as Record<string, any>) : {};
  const val = (keys: string[], fb = 0) => {
    for (const k of keys) {
      const v = o[k];
      if (v !== undefined && v !== null && v !== "") return Number(v);
    }
    return fb;
  };

  const base = {
    delegation: val(["delegation", "権限委譲・構造健全度", "delegation_score"]),
    orgDrag: val(["orgDrag", "組織進化阻害", "org_drag"]),
    commGap: val(["commGap", "コミュ力誤差", "comm_gap"]),
    updatePower: val(["updatePower", "アップデート力", "update_power"]),
    genGap: val(["genGap", "ジェネギャップ感覚", "gen_gap"]),
    harassmentAwareness: val([
      "harassmentAwareness",
      "harassment_awareness",
      "無自覚ハラ傾向",
      "無自覚ハラスメント傾向",
      "harassmentRisk",
    ]),
  };

  return ensureHarassmentAliases(base);
}

function coerceScorePattern(v: unknown): ScorePattern {
  const src = (v && typeof v === "object" ? (v as Record<string, unknown>) : {}) as Record<
    string,
    unknown
  >;
  const out: Record<QuestionId, string> = {} as any;
  for (let i = 1 as const; i <= 16; i++) {
    const k = `Q${i}` as QuestionId;
    const raw = src[k];
    let text = "";
    if (Array.isArray(raw)) {
      const first = (raw as unknown[])[0];
      text = typeof first === "string" ? first : String(first ?? "");
    } else if (typeof raw === "string") text = raw;
    else if (raw != null) text = String(raw);
    out[k] = text ?? "";
  }
  return out as ScorePattern;
}

async function fetchRow(rid: string) {
  const admin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );
  for (const t of TABLES) {
    const { data } = await admin.from(t).select("*").eq("id", rid).limit(1).maybeSingle();
    if (data) return { t, row: data as Row };
  }
  return null;
}

// ---------------- Page ----------------
type Props = { params: { rid: string } };

export default async function Page({ params }: Props) {
  const ridOk = Rid.safeParse(params.rid);
  if (!ridOk.success) redirect(`/result?rid=${encodeURIComponent(params.rid)}`);
  const rid = ridOk.data;

  const hit = await fetchRow(rid);
  if (!hit) redirect(`/result?rid=${encodeURIComponent(rid)}`);

  const row = hit.row;

  const scores =
    coerceScores(
      first<any>(
        row.normalized_scores,
        row.scores,
        row.categories_json,
        row.categories,
        row.category_scores,
        row["スコア"],
      ),
    ) ??
    ({
      delegation: 0,
      orgDrag: 0,
      commGap: 0,
      updatePower: 0,
      genGap: 0,
      harassmentAwareness: 0,
    } satisfies NormalizedCategoryScores);

  const samuraiType: SamuraiType =
    (first<string>(row.samurai_type, row.type, row.result_type) as SamuraiType | undefined) ||
    judgeSamurai(scores);

  const content = (TYPE_CONTENTS as Record<SamuraiType, any>)[samuraiType];
  if (!content) {
    // 想定外タイプは結果画面へ退避
    redirect(`/result?rid=${encodeURIComponent(rid)}`);
  }

  // パーソナライズは安全実行（失敗しても空で進む）
  let personal:
    | ReturnType<typeof getPersonalizedComments>
    | { items: any[]; summary?: string } = { items: [] };
  try {
    personal = getPersonalizedComments({
      scorePattern: coerceScorePattern(first<any>(row.score_pattern, row.pattern_json, row.answers_json, row.raw_scores)),
      normalizedScores: scores,
      maxItems: 2,
    });
    if (!personal || !Array.isArray((personal as any).items)) {
      personal = { items: [] };
    }
  } catch {
    personal = { items: [] };
  }

  const companySize =
    first<string>(row.company_size, row.companySize, row.size, row.org_size) ?? "unknown";

  const openChat = {
    qrSrc: process.env.NEXT_PUBLIC_OPENCHAT_QR ?? undefined,
    linkHref: process.env.NEXT_PUBLIC_OPENCHAT_URL ?? undefined,
  };

  // 完全にシリアライズ可能にしてから渡す（予期せぬ型を除去）
  const serial = JSON.parse(
    JSON.stringify({
      diagId: rid,
      samuraiType,
      scores,
      companySize,
      content,
      personal,
    }),
  );

  return (
    <main className="container py-6">
      <ReportTemplate
        diagId={serial.diagId}
        samuraiType={serial.samuraiType}
        normalizedScores={serial.scores}
        companySize={serial.companySize}
        content={serial.content}
        personal={serial.personal}
        openChat={openChat}
        brandLogoSrc="/images/iot-logo.svg"
        brandSiteUrl="https://ourdx-mtg.com/"
        shareUrl={process.env.NEXT_PUBLIC_SHARE_URL ?? "#"}
        consultUrl={process.env.NEXT_PUBLIC_CONSULT_URL ?? "#"}
      />
    </main>
  );
}
