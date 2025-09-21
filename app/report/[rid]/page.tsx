// app/report/[rid]/page.tsx
import { notFound } from "next/navigation";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import ReportTemplate from "@/components/report/ReportTemplate";
import {
  type NormalizedCategoryScores,
  type SamuraiType,
  type ScorePattern,
  type QuestionId,
} from "@/types/diagnosis";
// ★ 結果画面と統一のタイプ決定
import { resolveSamuraiType } from "@/lib/result/normalize";
import { TYPE_CONTENTS } from "@/lib/report/typeContents";
import { getPersonalizedComments } from "@/lib/report/personalization";
import { ensureHarassmentAliases } from "@/lib/harassmentKey";

export const revalidate = 0;
export const runtime = "nodejs";

const Rid = z.string().uuid();

/** Q1〜Q16 を string で必ず埋める */
function coerceScorePattern(v: unknown): ScorePattern {
  const src = (v && typeof v === "object" ? (v as Record<string, unknown>) : {}) as Record<
    string,
    unknown
  >;
  const qs: QuestionId[] = [
    "Q1","Q2","Q3","Q4","Q5","Q6","Q7","Q8",
    "Q9","Q10","Q11","Q12","Q13","Q14","Q15","Q16",
  ];
  const out: Record<QuestionId, string> = {} as any;
  for (const q of qs) {
    const raw = src[q];
    let text = "";
    if (Array.isArray(raw)) {
      const first = (raw as unknown[])[0];
      text = typeof first === "string" ? first : String(first ?? "");
    } else if (typeof raw === "string") text = raw;
    else if (raw != null) text = String(raw);
    out[q] = text ?? "";
  }
  return out as ScorePattern;
}

/** DB行 → 共通形 */
function normalizeRow(row: any): {
  id: string;
  company_size?: string | null;
  normalized_scores?: Record<string, unknown> | null;
  scores?: Record<string, unknown> | null;
  categories_json?: Array<{ key: string; score: number }> | null;
  samurai_type?: string | null;
  score_pattern?: unknown;
} {
  if (!row) {
    return {
      id: "",
      company_size: null,
      normalized_scores: null,
      scores: null,
      categories_json: null,
      samurai_type: null,
      score_pattern: null,
    };
  }
  return {
    id: row.id,
    company_size: row.company_size ?? row.size ?? null,
    normalized_scores: row.normalized_scores ?? row.scores ?? null,
    scores: row.scores ?? row.normalized_scores ?? null,
    categories_json: row.categories_json ?? row.categories ?? row.categoriesJson ?? null,
    samurai_type: row.samurai_type ?? row.type ?? null,
    score_pattern: row.score_pattern ?? row.pattern ?? row.answer_snapshot ?? null,
  };
}

/** キー名ゆれ（snake_case/日本語）を camelCase に正規化 */
function normalizeKey(k: string): keyof NormalizedCategoryScores {
  const s = String(k || "").trim();
  const map: Record<string, keyof NormalizedCategoryScores> = {
    delegation: "delegation",
    org_drag: "orgDrag",
    orgDrag: "orgDrag",
    comm_gap: "commGap",
    commGap: "commGap",
    update_power: "updatePower",
    updatePower: "updatePower",
    gen_gap: "genGap",
    genGap: "genGap",
    harassment: "harassmentAwareness",
    harassment_awareness: "harassmentAwareness",
    harassment_risk: "harassmentAwareness",
    "無自覚ハラ傾向": "harassmentAwareness",
    "無自覚ハラスメント傾向": "harassmentAwareness",
    "権限委譲・構造健全度": "delegation",
    "組織進化阻害": "orgDrag",
    "コミュ力誤差": "commGap",
    "アップデート力": "updatePower",
    "ジェネギャップ感覚": "genGap",
  };
  return (map[s] || (s as keyof NormalizedCategoryScores)) as keyof NormalizedCategoryScores;
}

/** 任意の形から NormalizedCategoryScores を復元（フェイルオープン） */
function buildScores(input: {
  objectLike?: Record<string, unknown> | null;
  arrayLike?: Array<{ key: any; score: any }> | null;
}): NormalizedCategoryScores | null {
  let obj: Record<string, unknown> | null = null;

  if (input.objectLike && typeof input.objectLike === "object" && !Array.isArray(input.objectLike)) {
    obj = { ...input.objectLike };
  }

  if (!obj && Array.isArray(input.arrayLike) && input.arrayLike.length > 0) {
    obj = {};
    for (const it of input.arrayLike) {
      if (!it) continue;
      const k = normalizeKey((it as any).key ?? "");
      obj[k] = (it as any).score;
    }
  }

  if (!obj) return null;

  obj = ensureHarassmentAliases(obj);

  const num = (v: any) => (v == null || v === "" ? 0 : Number(v) || 0);
  const out: NormalizedCategoryScores = {
    delegation: num(obj["delegation"]),
    orgDrag: num(obj["orgDrag"]),
    commGap: num(obj["commGap"]),
    updatePower: num(obj["updatePower"]),
    genGap: num(obj["genGap"]),
    harassmentAwareness: num(obj["harassmentAwareness"]),
  };
  return out;
}

type PageProps = { params: { rid: string } };

export default async function ReportPage({ params }: PageProps) {
  const rid = Rid.safeParse(params.rid);
  if (!rid.success) return notFound();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  // 1) diagnoses を優先
  let { data, error } = await supabase
    .from("diagnoses")
    .select(
      "id, company_size, normalized_scores, scores, categories_json, categories, samurai_type, score_pattern, pattern, answer_snapshot"
    )
    .eq("id", rid.data)
    .limit(1)
    .maybeSingle();

  // 2) 無ければ samurairesults
  if (error || !data) {
    const fb = await supabase
      .from("samurairesults")
      .select(
        "id, company_size, size, normalized_scores, scores, categories_json, categories, samurai_type, type, score_pattern, pattern, answer_snapshot"
      )
      .eq("id", rid.data)
      .limit(1)
      .maybeSingle();
    data = fb.data as any;
  }

  if (!data) return notFound(); // rid は正しいが DB に無い（非常に稀）

  const row = normalizeRow(data);

  // --- スコア復元（オブジェクト or 配列 どちらからでも） ---
  const scores =
    buildScores({
      objectLike: row.normalized_scores ?? row.scores ?? null,
      arrayLike: row.categories_json ?? null,
    }) ||
    // どうしても無い場合は 0 埋め（描画を止めない）
    ({
      delegation: 0,
      orgDrag: 0,
      commGap: 0,
      updatePower: 0,
      genGap: 0,
      harassmentAwareness: 0,
    } as NormalizedCategoryScores);

  // ★ 結果画面と同じロジックでタイプ確定
  const samuraiType: SamuraiType =
    resolveSamuraiType(typeof row.samurai_type === "string" ? row.samurai_type : "", scores) ||
    ((row.samurai_type as SamuraiType | undefined) ?? "豊臣秀吉型");

  const content = (TYPE_CONTENTS as Record<SamuraiType, any>)[samuraiType];
  if (!content) return notFound();

  const personal = getPersonalizedComments({
    scorePattern: coerceScorePattern(row.score_pattern),
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
        diagId={row.id}
        samuraiType={samuraiType}
        normalizedScores={scores}
        companySize={(row.company_size as string | undefined) ?? "unknown"}
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
