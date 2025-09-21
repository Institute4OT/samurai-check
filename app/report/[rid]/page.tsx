// app/report/[rid]/page.tsx
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import ReportTemplate from "@/components/report/ReportTemplate";
import {
  type NormalizedCategoryScores,
  type SamuraiType,
  type ScorePattern,
  type QuestionId,
} from "@/types/diagnosis";
// ★ 判定ロジックを結果画面と完全統一
import { resolveSamuraiType } from "@/lib/result/normalize";

import { TYPE_CONTENTS } from "@/lib/report/typeContents";
import { getPersonalizedComments } from "@/lib/report/personalization";
import { ensureHarassmentAliases } from "@/lib/harassmentKey";

export const revalidate = 0;
export const runtime = "nodejs"; // Supabase-js を確実に Node で

// rid は UUID 想定（ULID 等を許すならここを拡張）
const Rid = z.string().uuid();

/** 受け取ったオブジェクトを「必ず Q1〜Q16 を持つ ScorePattern(= string)」に整形 */
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
    } else if (typeof raw === "string") {
      text = raw;
    } else if (raw != null) {
      text = String(raw);
    } else {
      text = "";
    }
    out[q] = text;
  }

  return out as ScorePattern;
}

/** DB行をレポート用の共通形に正規化 */
function normalizeRow(row: any): {
  id: string;
  company_size?: string | null;
  normalized_scores?: Record<string, unknown> | null;
  samurai_type?: string | null;
  score_pattern?: unknown;
  categories_json?: Array<{ key: string; score: number }> | null;
} {
  if (!row) {
    return {
      id: "",
      company_size: null,
      normalized_scores: null,
      samurai_type: null,
      score_pattern: null,
      categories_json: null,
    };
  }
  return {
    id: row.id,
    company_size: row.company_size ?? row.size ?? null,
    // scores/normalized_scores のどちらでも受け取り
    normalized_scores: row.normalized_scores ?? row.scores ?? null,
    samurai_type: row.samurai_type ?? row.type ?? null,
    score_pattern: row.score_pattern ?? row.pattern ?? row.answer_snapshot ?? null,
    // result finalize が保存する配列形も拾う
    categories_json:
      row.categories_json ??
      row.categories ??
      row.categoriesJson ??
      null,
  };
}

/** 配列形(categories_json)や snake_case を受けて、最終の NormalizedCategoryScores に整形 */
function buildScores(input: {
  normalized_scores?: Record<string, unknown> | null;
  categories_json?: Array<{ key: string; score: number }> | null;
}): NormalizedCategoryScores | null {
  const objectLike = (v: unknown): v is Record<string, unknown> =>
    !!v && typeof v === "object" && !Array.isArray(v);

  // 1) まずオブジェクト形があれば優先（旧・新どちらでも）
  let obj: Record<string, unknown> | null = null;
  if (objectLike(input.normalized_scores)) {
    obj = { ...(input.normalized_scores as Record<string, unknown>) };
  }

  // 2) 無ければ配列形から復元
  if (!obj && Array.isArray(input.categories_json) && input.categories_json.length > 0) {
    obj = {};
    for (const item of input.categories_json) {
      if (!item) continue;
      const rawKey = String((item as any).key ?? "").trim();
      const rawVal = (item as any).score;
      // キーのゆれ（snake_case / 日本語）を吸収
      const k = normalizeKey(rawKey);
      obj[k] = rawVal;
    }
  }

  if (!obj) return null;

  // 3) 「無自覚ハラ傾向」の旧名・日本語キーを吸収＆数値化
  obj = ensureHarassmentAliases(obj);

  // 4) 最終的に必要6キーを coerce して返す
  const pick = (v: any) => (v == null || v === "" ? 0 : Number(v) || 0);

  const out: NormalizedCategoryScores = {
    delegation: pick(obj["delegation"]),
    orgDrag: pick(obj["orgDrag"]),
    commGap: pick(obj["commGap"]),
    updatePower: pick(obj["updatePower"]),
    genGap: pick(obj["genGap"]),
    harassmentAwareness: pick(obj["harassmentAwareness"]),
  };

  return out;
}

/** キー名ゆれの正規化（snake_case / 日本語キー対応） */
function normalizeKey(k: string): keyof NormalizedCategoryScores {
  const s = k.trim();
  // すでに camelCase の可能性
  if (
    s === "delegation" ||
    s === "orgDrag" ||
    s === "commGap" ||
    s === "updatePower" ||
    s === "genGap" ||
    s === "harassmentAwareness"
  ) {
    return s as keyof NormalizedCategoryScores;
  }
  // snake_case → camelCase
  const mapSnake: Record<string, keyof NormalizedCategoryScores> = {
    delegation: "delegation",
    org_drag: "orgDrag",
    comm_gap: "commGap",
    update_power: "updatePower",
    gen_gap: "genGap",
    harassment: "harassmentAwareness",
    harassment_awareness: "harassmentAwareness",
    harassment_risk: "harassmentAwareness",
  };
  if (mapSnake[s]) return mapSnake[s];

  // 日本語キー
  const mapJa: Record<string, keyof NormalizedCategoryScores> = {
    権限委譲: "delegation",
    組織進化阻害: "orgDrag",
    コミュニケーションギャップ: "commGap",
    更新力: "updatePower",
    世代間ギャップ: "genGap",
    無自覚ハラ傾向: "harassmentAwareness",
    無自覚ハラスメント傾向: "harassmentAwareness",
  };
  if (mapJa[s]) return mapJa[s];

  // 不明キーは落とすが、最終 Zod で判定
  return s as keyof NormalizedCategoryScores;
}

type PageProps = { params: { rid: string } };

export default async function ReportPage({ params }: PageProps) {
  const rid = Rid.safeParse(params.rid);
  if (!rid.success) return notFound();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  // 1) まず diagnoses を見る
  let { data, error } = await supabase
    .from("diagnoses")
    .select("id, company_size, normalized_scores, samurai_type, score_pattern, categories_json, categories")
    .eq("id", rid.data)
    .limit(1)
    .maybeSingle();

  // 2) 無ければ samurairesults を見る（新フォーマット対応）
  if (error || !data) {
    const fallback = await supabase
      .from("samurairesults")
      .select(
        "id, company_size, size, normalized_scores, scores, samurai_type, type, score_pattern, pattern, answer_snapshot, categories_json, categories"
      )
      .eq("id", rid.data)
      .limit(1)
      .maybeSingle();
    data = fallback.data as any;
    error = fallback.error as any;
  }

  // 行が無い / 取得エラー → 404にせず結果画面へ退避（UX優先）
  if (error || !data) {
    redirect(`/result?rid=${encodeURIComponent(rid.data)}`);
  }

  const row = normalizeRow(data);

  // --- スコア受け口を超寛容化（object / array / snake / 日本語キー） ---
  const scoresObj = buildScores({
    normalized_scores: row.normalized_scores ?? undefined,
    categories_json: row.categories_json ?? undefined,
  });

  // scores が不正/NULL → 結果画面へ退避（Finalize 未完の保険）
  const ScoresSchema = z.object({
    delegation: z.coerce.number(),
    orgDrag: z.coerce.number(),
    commGap: z.coerce.number(),
    updatePower: z.coerce.number(),
    genGap: z.coerce.number(),
    harassmentAwareness: z.coerce.number(),
  });
  const ok = scoresObj && ScoresSchema.safeParse(scoresObj).success;
  if (!ok) {
    redirect(`/result?rid=${encodeURIComponent(rid.data)}`);
  }

  const scores = scoresObj as NormalizedCategoryScores;

  // ★ タイプ判定は結果画面と同じ resolveSamuraiType を使用（ズレ防止）
  const samuraiType: SamuraiType | undefined = resolveSamuraiType(
    typeof row.samurai_type === "string" ? row.samurai_type : "",
    scores,
  ) || (row.samurai_type as SamuraiType | undefined);

  const content = (TYPE_CONTENTS as Record<SamuraiType, any>)[samuraiType as SamuraiType];
  if (!content) return notFound();

  // 個別コメント：scorePattern は必須キーを補完し、string に正規化
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
        samuraiType={samuraiType as SamuraiType}
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
