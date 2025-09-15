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
  const src = (
    v && typeof v === "object" ? (v as Record<string, unknown>) : {}
  ) as Record<string, unknown>;

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

type PageProps = { params: { rid: string } };

export default async function ReportPage({ params }: PageProps) {
  const rid = Rid.safeParse(params.rid);
  if (!rid.success) return notFound();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const { data, error } = await supabase
    .from("diagnoses")
    .select("id, company_size, normalized_scores, samurai_type, score_pattern")
    .eq("id", rid.data)
    .limit(1)
    .maybeSingle();

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

  const rawScores = (data.normalized_scores ?? {}) as Record<string, unknown>;
  const normalizedScoresObj = ensureHarassmentAliases(rawScores);
  const ok = ScoresSchema.safeParse(normalizedScoresObj).success;
  if (!ok) {
    redirect(`/result?rid=${encodeURIComponent(rid.data)}`);
  }

  const scores = normalizedScoresObj as NormalizedCategoryScores;

  // samurai_type 無しならスコアから判定
  let samuraiType: SamuraiType | undefined =
    typeof data.samurai_type === "string" && data.samurai_type
      ? (data.samurai_type as SamuraiType)
      : undefined;
  if (!samuraiType) samuraiType = judgeSamurai(scores);

  const content = (TYPE_CONTENTS as Record<SamuraiType, any>)[samuraiType];
  if (!content) return notFound();

  // 個別コメント：scorePattern は必須キーを補完し、string に正規化
  const personal = getPersonalizedComments({
    scorePattern: coerceScorePattern(data.score_pattern),
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
        diagId={data.id}
        samuraiType={samuraiType}
        normalizedScores={scores}
        companySize={(data.company_size as string | undefined) ?? "unknown"}
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
