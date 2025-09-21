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
import { judgeSamurai } from "@/lib/samuraiJudge"; // ← 修正：存在するエクスポート名を使用
import { TYPE_CONTENTS } from "@/lib/report/typeContents";
import { getPersonalizedComments } from "@/lib/report/personalization";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// ---- Util ----
const Rid = z.string().uuid();

type Row = Record<string, any>;
const TABLE_CANDIDATES = [
  "diagnoses",
  "samurairesults",
  "samurai_results",
  "samurairesult",
  "results",
] as const;

function pickFirst<T>(...vals: (T | null | undefined)[]) {
  for (const v of vals) if (v !== null && v !== undefined) return v as T;
  return undefined;
}

// harassment の表記ゆれを吸収
function ensureHarassmentAliases<T extends Record<string, any>>(
  scores: T,
): T & { harassmentAwareness?: number; harassmentRisk?: number } {
  const v = Number.isFinite(scores["harassmentAwareness"])
    ? scores["harassmentAwareness"]
    : Number(scores["無自覚ハラ傾向"] ?? scores["harassment_awareness"] ?? 0);
  const r = Number.isFinite(scores["harassmentRisk"])
    ? scores["harassmentRisk"]
    : Number(scores["無自覚ハラスメント傾向"] ?? scores["harassment_risk"] ?? v ?? 0);
  return { ...scores, harassmentAwareness: v, harassmentRisk: r };
}

// 受け取り形の違いを正規化して NormalizedCategoryScores をつくる
function coerceScores(src: any): NormalizedCategoryScores | null {
  if (!src) return null;

  // 配列（categories_json 等）
  if (Array.isArray(src) && src.length >= 6) {
    // 想定： deleg/org/comm/update/gen/harassment*
    const n = (i: number) => Number(src[i] ?? 0);
    const obj = {
      delegation: n(0),
      orgDrag: n(1),
      commGap: n(2),
      updatePower: n(3),
      genGap: n(4),
      harassmentAwareness: n(5),
    };
    return obj as NormalizedCategoryScores;
  }

  // オブジェクト系
  const o = typeof src === "object" ? (src as Record<string, any>) : {};
  const val = (a: string[], fallback = 0) => {
    for (const k of a) {
      const v = o[k];
      if (v !== undefined && v !== null) return Number(v);
    }
    return fallback;
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
      "harassmentRisk", // 古い保存で混在しているケースの救済
    ]),
  };

  return ensureHarassmentAliases(base) as NormalizedCategoryScores;
}

// Q1〜Q16 を必ず埋めて ScorePattern を返す
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
  return out as ScorePattern; // ← 修正：型を ScorePattern に
}

// ---- Supabase fetcher（表記ゆれを全部吸う）----
async function loadByRid(rid: string) {
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  let row: Row | null = null;
  let fromTable: string | null = null;

  for (const t of TABLE_CANDIDATES) {
    const { data, error } = await supabase
      .from(t)
      .select("*")
      .eq("id", rid)
      .limit(1)
      .maybeSingle();

    if (error || !data) continue;
    row = data;
    fromTable = t;
    break;
  }

  if (!row) return null;

  const companySize =
    pickFirst<string>(row.company_size, row.companySize, row.size, row.org_size) ?? "unknown";

  const normalized =
    coerceScores(
      pickFirst<any>(
        row.normalized_scores,
        row.scores,
        row.categories_json,
        row.categories,
        row.category_scores,
        row["スコア"],
      ),
    ) ?? null;

  const samuraiType =
    (row.samurai_type as SamuraiType | undefined) ||
    (row.type as SamuraiType | undefined) ||
    (row.result_type as SamuraiType | undefined) ||
    undefined;

  const scorePattern =
    pickFirst<any>(row.score_pattern, row.pattern_json, row.answers_json, row.raw_scores) ?? {};

  return {
    fromTable,
    companySize,
    normalized,
    samuraiType,
    scorePattern,
    id: rid,
  };
}

// ---- Page ----
type PageProps = { params: { rid: string } };

export default async function ReportPage({ params }: PageProps) {
  const ridParse = Rid.safeParse(params.rid);
  if (!ridParse.success) {
    redirect(`/result?rid=${encodeURIComponent(params.rid)}`);
  }
  const rid = ridParse.data;

  const loaded = await loadByRid(rid);

  // どのテーブルにも無い → 結果画面に逃がす
  if (!loaded) {
    redirect(`/result?rid=${encodeURIComponent(rid)}`);
  }

  const scores =
    (loaded!.normalized as NormalizedCategoryScores | null) ??
    ({
      delegation: 0,
      orgDrag: 0,
      commGap: 0,
      updatePower: 0,
      genGap: 0,
      harassmentAwareness: 0,
    } satisfies NormalizedCategoryScores);

  // 保存済みが無ければスコアから再計算
  const samuraiType: SamuraiType =
    (loaded!.samuraiType as SamuraiType | undefined) || judgeSamurai(scores);

  const content = (TYPE_CONTENTS as Record<SamuraiType, any>)[samuraiType];
  if (!content) notFound();

  const personal = getPersonalizedComments({
    scorePattern: coerceScorePattern(loaded!.scorePattern), // ← 修正：ScorePattern で渡る
    normalizedScores: scores,
    maxItems: 2,
  });

  const openChat = {
    qrSrc: process.env.NEXT_PUBLIC_OPENCHAT_QR ?? undefined,
    linkHref: process.env.NEXT_PUBLIC_OPENCHAT_URL ?? undefined,
  };

  return (
    <main className="container py-6">
      <ReportTemplate
        diagId={loaded!.id}
        samuraiType={samuraiType}
        normalizedScores={scores}
        companySize={loaded!.companySize}
        content={content}
        personal={personal}
        openChat={openChat}
        brandLogoSrc="/images/iot-logo.svg"
        brandSiteUrl="https://ourdx-mtg.com/"
        shareUrl={process.env.NEXT_PUBLIC_SHARE_URL ?? "#"}
        consultUrl={process.env.NEXT_PUBLIC_CONSULT_URL ?? "#"}
      />
    </main>
  );
}
