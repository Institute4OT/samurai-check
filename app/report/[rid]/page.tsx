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
import { judgeSamurai } from "@/lib/samuraiJudge";
import { TYPE_CONTENTS } from "@/lib/report/typeContents";
import { getPersonalizedComments } from "@/lib/report/personalization";
import { ensureHarassmentAliases } from "@/lib/harassmentKey";

export const revalidate = 0;

// rid は UUID 想定（ULID 等を許すならここを拡張）
const Rid = z.string().uuid();

/** 受け取ったオブジェクトを「必ず Q1〜Q16 を持つ ScorePattern(= string)」に整形 */
function coerceScorePattern(v: unknown): ScorePattern {
  const src = (v && typeof v === "object" ? (v as Record<string, unknown>) : {}) as Record<string, unknown>;
  const qs: QuestionId[] = ["Q1","Q2","Q3","Q4","Q5","Q6","Q7","Q8","Q9","Q10","Q11","Q12","Q13","Q14","Q15","Q16"];
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
} {
  if (!row) return { id: "", company_size: null, normalized_scores: null, samurai_type: null, score_pattern: null };
  return {
    id: row.id,
    company_size: row.company_size ?? row.size ?? null,
    // scores/normalized_scores のどちらでも受け取り、日本語キーも吸収
    normalized_scores: row.normalized_scores ?? row.scores ?? null,
    samurai_type: row.samurai_type ?? row.type ?? null,
    score_pattern: row.score_pattern ?? row.pattern ?? row.answer_snapshot ?? null,
  };
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
    .select("id, company_size, normalized_scores, samurai_type, score_pattern")
    .eq("id", rid.data)
    .limit(1)
    .maybeSingle();

  // 2) 無ければ samurairesults を見る（新フォーマット対応）
  if (error || !data) {
    const fallback = await supabase
      .from("samurairesults")
      .select("id, company_size, size, normalized_scores, scores, samurai_type, type, score_pattern, pattern, answer_snapshot")
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

  // scores が不正/NULL → 結果画面へ退避（Finalize 未完の保険）
  // ① 旧キー/日本語キーを補正し、② 文字列数値も coerce で許容して検証
  const ScoresSchema = z.object({
    delegation: z.coerce.number(),
    orgDrag: z.coerce.number(),
    commGap: z.coerce.number(),
    updatePower: z.coerce.number(),
    genGap: z.coerce.number(),
    harassmentAwareness: z.coerce.number(),
  });

  const norm = normalizeRow(data);
  const rawScores = (norm.normalized_scores ?? {}) as Record<string, unknown>;
  const normalizedScoresObj = ensureHarassmentAliases(rawScores);
  const ok = ScoresSchema.safeParse(normalizedScoresObj).success;
  if (!ok) {
    redirect(`/result?rid=${encodeURIComponent(rid.data)}`);
  }

  const scores = normalizedScoresObj as NormalizedCategoryScores;

  // samurai_type 無しならスコアから判定
  let samuraiType: SamuraiType | undefined =
    typeof norm.samurai_type === "string" && norm.samurai_type
      ? (norm.samurai_type as SamuraiType)
      : undefined;
  if (!samuraiType) samuraiType = judgeSamurai(scores);

  const content = (TYPE_CONTENTS as Record<SamuraiType, any>)[samuraiType];
  if (!content) return notFound();

  // 個別コメント：scorePattern は必須キーを補完し、string に正規化
  const personal = getPersonalizedComments({
    scorePattern: coerceScorePattern(norm.score_pattern),
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
        diagId={norm.id}
        samuraiType={samuraiType}
        normalizedScores={scores}
        companySize={(norm.company_size as string | undefined) ?? "unknown"}
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
