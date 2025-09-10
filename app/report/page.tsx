// /app/report/page.tsx
import { notFound } from 'next/navigation';
import ReportTemplate from '@/components/report/ReportTemplate';
import type { NormalizedCategoryScores, SamuraiType } from '@/types/diagnosis';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { TYPE_CONTENTS } from '@/lib/report/typeContents'; // 型別テキスト集（既存）
import { judgeSamurai } from '@/lib/samuraiJudge';         // samurai_type欠損時の保険

export const revalidate = 0;

// --- 型＆バリデーション ---
const SamuraiTypeEnum = z.enum([
  '真田幸村型',
  '今川義元型',
  '斎藤道三型',
  '織田信長型',
  '豊臣秀吉型',
  '徳川家康型',
  '上杉謙信型',
]);

const ScoresSchema = z.object({
  delegation: z.number().min(0).max(3),
  orgDrag: z.number().min(0).max(3),
  commGap: z.number().min(0).max(3),
  updatePower: z.number().min(0).max(3),
  genGap: z.number().min(0).max(3),
  harassmentAwareness: z.number().min(0).max(3),
}) satisfies z.ZodType<NormalizedCategoryScores>;

const ParamsSchema = z.object({
  id: z.string().uuid().optional(),
  samuraiType: SamuraiTypeEnum.optional(),
  scores: z.string().optional(), // JSON.stringify(NormalizedCategoryScores)
});

type PageProps = {
  searchParams?: Record<string, string | string[] | undefined>;
};

// --- ユーティリティ ---
function parseScoresJson(json?: string): NormalizedCategoryScores | undefined {
  if (!json) return undefined;
  try {
    const raw = JSON.parse(json);
    const parsed = ScoresSchema.parse(raw);
    return parsed;
  } catch {
    return undefined;
  }
}

async function fetchFromSupabase(id: string) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  if (!supabaseUrl || !anonKey) {
    return { id: undefined as string | undefined, company_size: undefined as string | undefined, type: undefined as SamuraiType | undefined, scores: undefined as NormalizedCategoryScores | undefined };
  }

  const supabase = createClient(supabaseUrl, anonKey);
  const { data, error } = await supabase
    .from('diagnoses')
    .select('id, company_size, samurai_type, normalized_scores')
    .eq('id', id)
    .limit(1)
    .maybeSingle();

  if (error || !data) {
    return { id: undefined, company_size: undefined, type: undefined, scores: undefined };
  }

  const type = SamuraiTypeEnum.safeParse(data.samurai_type).success
    ? (data.samurai_type as SamuraiType)
    : undefined;

  let scores: NormalizedCategoryScores | undefined;
  try {
    scores = ScoresSchema.parse(data.normalized_scores);
  } catch {
    scores = undefined;
  }

  return { id: data.id as string, company_size: (data.company_size as string | undefined) ?? 'unknown', type, scores };
}

// --- ページ本体 ---
export default async function ReportPage({ searchParams }: PageProps) {
  // 1) クエリの正規化
  const params = ParamsSchema.safeParse(
    Object.fromEntries(
      Object.entries(searchParams ?? {}).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v]),
    ),
  );
  if (!params.success) return notFound();

  let diagId: string | undefined;
  let companySize: string | undefined;
  let samuraiType: SamuraiType | undefined;
  let normalizedScores: NormalizedCategoryScores | undefined;

  // 2) DB優先で取得
  if (params.data.id) {
    const { id, company_size, type, scores } = await fetchFromSupabase(params.data.id);
    diagId = id ?? diagId;
    companySize = company_size ?? companySize;
    samuraiType = type ?? samuraiType;
    normalizedScores = scores ?? normalizedScores;
  }

  // 3) フォールバック（クエリ直指定）
  if (!samuraiType && params.data.samuraiType) samuraiType = params.data.samuraiType;
  if (!normalizedScores && params.data.scores) normalizedScores = parseScoresJson(params.data.scores);

  // samurai_type が無い場合はスコアから判定
  if (!samuraiType && normalizedScores) samuraiType = judgeSamurai(normalizedScores);

  // 4) 最終チェック
  if (!samuraiType || !normalizedScores) return notFound();

  // 型別本文（既存 typeContents を使用・文言改変なし）
  const content = (TYPE_CONTENTS as Record<SamuraiType, any>)[samuraiType];
  if (!content) return notFound();

  // 5) レンダリング（ReportTemplate の“フル装備版” Props をすべて供給）
  return (
    <main className="container py-6">
      <ReportTemplate
        diagId={diagId ?? 'N/A'}
        samuraiType={samuraiType}
        normalizedScores={normalizedScores}
        companySize={companySize ?? 'unknown'}
        content={content}
        // personalization は [rid] 版で注入しているのでここでは省略可（ReportBody 側でフォールバック動作）
        openChat={{
          qrSrc: process.env.NEXT_PUBLIC_OPENCHAT_QR ?? undefined,
          linkHref: process.env.NEXT_PUBLIC_OPENCHAT_URL ?? undefined,
        }}
        brandLogoSrc="/images/iot-logo.svg"
        brandSiteUrl="https://ourdx-mtg.com/"
        shareUrl={process.env.NEXT_PUBLIC_SHARE_URL ?? '#'}
        consultUrl={process.env.NEXT_PUBLIC_CONSULT_URL ?? '#'}
      />
    </main>
  );
}
