// app/report/page.tsx

import { notFound } from "next/navigation";
import ReportTemplate from "@/components/report/ReportTemplate";
import type { NormalizedCategoryScores, SamuraiType } from "@/types/diagnosis";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import { TYPE_CONTENTS } from "@/lib/report/typeContents";
import { judgeSamurai } from "@/lib/samuraiJudge";
import { ensureHarassmentAliases } from "@/lib/harassmentKey";

export const revalidate = 0;

/* ===================== 型 & バリデーション ===================== */

const SamuraiTypeEnum = z.enum([
  "真田幸村型",
  "今川義元型",
  "斎藤道三型",
  "織田信長型",
  "豊臣秀吉型",
  "徳川家康型",
  "上杉謙信型",
]);

const ScoresSchema = z.object({
  delegation: z.number().min(0).max(3),
  orgDrag: z.number().min(0).max(3),
  commGap: z.number().min(0).max(3),
  updatePower: z.number().min(0).max(3),
  genGap: z.number().min(0).max(3),
  harassmentAwareness: z.number().min(0).max(3),
  harassmentRisk: z.number().min(0).max(3).optional(),
}) as z.ZodType<NormalizedCategoryScores>;

const ParamsSchema = z.object({
  id: z.string().uuid().optional(),
  samuraiType: SamuraiTypeEnum.optional(),
  scores: z.string().optional(),
});

type PageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

/* ===================== ユーティリティ ===================== */

function parseScoresFromParam(
  raw?: string | null,
): NormalizedCategoryScores | undefined {
  if (!raw) return undefined;
  try {
    const obj = JSON.parse(raw);
    return ScoresSchema.parse(obj);
  } catch (err) {
    console.warn("⚠️ parseScoresFromParam failed:", err, raw);
    return undefined;
  }
}

async function fetchFromSupabase(id: string): Promise<{
  id?: string;
  company_size?: string;
  type?: SamuraiType;
  scores?: NormalizedCategoryScores;
}> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!supabaseUrl || !anonKey) return {};

  const supabase = createClient(supabaseUrl, anonKey);
  const { data, error } = await supabase
    .from("diagnoses")
    .select("id, company_size, samurai_type, normalized_scores")
    .eq("id", id)
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    console.error("❌ Supabase fetch error:", error);
    return {};
  }

  const type = SamuraiTypeEnum.safeParse(data.samurai_type).success
    ? (data.samurai_type as SamuraiType)
    : undefined;

  let scores: NormalizedCategoryScores | undefined;
  try {
    scores = ScoresSchema.parse(data.normalized_scores);
  } catch (err) {
    console.warn("⚠️ normalized_scores parse failed:", err, data.normalized_scores);
    scores = undefined;
  }

  return {
    id: data.id as string,
    company_size: (data.company_size as string | undefined) ?? "unknown",
    type,
    scores,
  };
}

/* ===================== ページ本体 ===================== */

export default async function ReportPage({ searchParams }: PageProps) {
  const params = ParamsSchema.safeParse(
    Object.fromEntries(
      Object.entries(searchParams ?? {}).map(([k, v]) => [
        k,
        Array.isArray(v) ? v[0] : v,
      ]),
    ),
  );
  if (!params.success) return notFound();

  if (!params.data.id && (searchParams as any)?.rid) {
    (params.data as any).id = String((searchParams as any).rid);
  }

  let diagId: string | undefined;
  let companySize: string | undefined;
  let samuraiType: SamuraiType | undefined;
  let normalizedScores: NormalizedCategoryScores | undefined;

  // 2) DB優先で取得
  if (params.data.id) {
    const fetched = await fetchFromSupabase(params.data.id);
    diagId = fetched.id ?? diagId;
    companySize = fetched.company_size ?? companySize;
    samuraiType = fetched.type ?? samuraiType;
    normalizedScores = fetched.scores ?? normalizedScores;
  }

  // 3) URLパラメータ fallback
  if (!normalizedScores && params.data.scores) {
    console.info("🌀 normalizedScores missing from DB. Fallback to URL param.");
    normalizedScores =
      parseScoresFromParam(params.data.scores) ?? normalizedScores;
  }

  // 4) still no score? -> 404
  if (!normalizedScores) {
    console.error("🚫 normalizedScores not found. Abort.");
    return notFound();
  }

  // 5) alias補正
  normalizedScores = ensureHarassmentAliases(normalizedScores);

  // 🔍ログ出力（デバッグ用）
  console.info("✅ normalizedScores:", normalizedScores);

  // 6) タイプ判定
  if (!samuraiType) {
    try {
      samuraiType = judgeSamurai(normalizedScores);
    } catch (err) {
      console.warn("⚠️ judgeSamurai failed:", err);
      samuraiType = undefined;
    }
  }
  if (!samuraiType) return notFound();

  // 7) 型別本文
  const content = (TYPE_CONTENTS as Record<SamuraiType, any>)[samuraiType];
  if (!content) return notFound();

  // 8) レンダリング
  return (
    <main className="container py-6">
      <ReportTemplate
        diagId={diagId ?? "N/A"}
        samuraiType={samuraiType}
        normalizedScores={normalizedScores}
        companySize={companySize ?? "unknown"}
        content={content}
        openChat={{
          qrSrc: process.env.NEXT_PUBLIC_OPENCHAT_QR ?? undefined,
          linkHref: process.env.NEXT_PUBLIC_OPENCHAT_URL ?? undefined,
        }}
        brandLogoSrc="/images/iot-logo.svg"
        brandSiteUrl="https://ourdx-mtg.com/"
        shareUrl={process.env.NEXT_PUBLIC_SHARE_URL ?? "#"}
        consultUrl={process.env.NEXT_PUBLIC_CONSULT_URL ?? "#"}
      />
    </main>
  );
}
