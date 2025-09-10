// /app/report/[rid]/page.tsx
import { notFound } from 'next/navigation';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import ReportTemplate from '@/components/report/ReportTemplate';
import type { NormalizedCategoryScores, SamuraiType } from '@/types/diagnosis';
import { judgeSamurai } from '@/lib/samuraiJudge';
import { TYPE_CONTENTS } from '@/lib/report/typeContents';
import { getPersonalizedComments } from '@/lib/report/personalization';

export const revalidate = 0;

const Rid = z.string().uuid();
const ScoresSchema = z.object({
  delegation: z.number().min(0).max(3),
  orgDrag: z.number().min(0).max(3),
  commGap: z.number().min(0).max(3),
  updatePower: z.number().min(0).max(3),
  genGap: z.number().min(0).max(3),
  harassmentAwareness: z.number().min(0).max(3),
}) satisfies z.ZodType<NormalizedCategoryScores>;

type PageProps = { params: { rid: string } };

export default async function ReportPage({ params }: PageProps) {
  const rid = Rid.safeParse(params.rid);
  if (!rid.success) return notFound();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  );

  const { data, error } = await supabase
    .from('diagnoses')
    .select('id, company_size, normalized_scores, samurai_type, score_pattern')
    .eq('id', rid.data)
    .limit(1)
    .maybeSingle();

  if (error || !data) return notFound();

  const scores = ScoresSchema.safeParse(data.normalized_scores).success
    ? (data.normalized_scores as NormalizedCategoryScores)
    : undefined;

  let samuraiType: SamuraiType | undefined =
    (typeof data.samurai_type === 'string' && data.samurai_type) ? (data.samurai_type as SamuraiType) : undefined;

  if (!scores) return notFound();
  if (!samuraiType) samuraiType = judgeSamurai(scores);

  const content = (TYPE_CONTENTS as Record<SamuraiType, any>)[samuraiType];
  if (!content) return notFound();

  // ★ 個別コメント（gifts/challenges）の生成
  // scoreMap を持っている場合は import して渡してください（任意）
  const personal = getPersonalizedComments({
    scorePattern: data.score_pattern ?? {},
    normalizedScores: scores,
    // scoreMap, // 例：import { SCORE_MAP } from '@/lib/report/categoryNormalize' 等
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
        companySize={data.company_size ?? 'unknown'}
        content={content}
        personal={personal}           // ← ここで注入
        openChat={openChat}
        brandLogoSrc="/images/iot-logo.svg"
        brandSiteUrl="https://ourdx-mtg.com/"
        shareUrl={process.env.NEXT_PUBLIC_SHARE_URL ?? '#'}
        consultUrl={process.env.NEXT_PUBLIC_CONSULT_URL ?? '#'}
      />
    </main>
  );
}
