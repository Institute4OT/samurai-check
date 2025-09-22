// app/report/[rid]/page.tsx
import "server-only";
import { notFound, redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@supabase/supabase-js";
import ReportTemplate from "@/components/report/ReportTemplate";
import type {
  NormalizedCategoryScores,
  SamuraiType,
  ScorePattern,
  QuestionId,
} from "@/types/diagnosis";
import { judgeSamurai } from "@/lib/samuraiJudge";
import { TYPE_CONTENTS } from "@/lib/report/typeContents";
import { getPersonalizedComments } from "@/lib/report/personalization";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// -------- utils
const Rid = z.string().uuid();

function coerceNum(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function coerceScorePattern(v: unknown): ScorePattern {
  const keys: QuestionId[] = [
    "Q1","Q2","Q3","Q4","Q5","Q6","Q7","Q8",
    "Q9","Q10","Q11","Q12","Q13","Q14","Q15","Q16",
  ];
  const out: Record<string,string> = {};
  if (v && typeof v === "object") {
    for (const k of keys) {
      const raw = (v as any)[k];
      if (typeof raw === "string") out[k] = raw;
      else if (Array.isArray(raw) && raw.length) out[k] = String(raw[0] ?? "");
      else if (raw != null) out[k] = String(raw);
      else out[k] = "";
    }
  } else {
    for (const k of keys) out[k] = "";
  }
  return out as ScorePattern;
}

// 「無自覚ハラ傾向」系の表記ゆれを吸収
function withHarassmentAliases(src: Record<string, unknown>): Record<string, unknown> {
  const v =
    (coerceNum(src.harassmentAwareness) ??
     coerceNum((src as any)["無自覚ハラ傾向"]) ??
     coerceNum((src as any)["harassment_risk"]) ??
     coerceNum((src as any)["無自覚ハラスメント傾向"]) ??
     0);
  return { ...src, harassmentAwareness: v, harassmentRisk: v };
}

function buildScores(row: Record<string, any>): NormalizedCategoryScores | null {
  // candidates: normalized_scores, scores, categories_json, mixed keys
  const srcRaw =
    row.normalized_scores ??
    row.scores ??
    row.categories_json ??
    row;

  if (!srcRaw || typeof srcRaw !== "object") return null;

  const src = withHarassmentAliases(srcRaw as any);

  const delegation =
    coerceNum(src.delegation) ??
    coerceNum((src as any)["権限委譲・構造健全度"]);
  const orgDrag =
    coerceNum(src.orgDrag) ??
    coerceNum((src as any)["組織進化阻害"]);
  const commGap =
    coerceNum(src.commGap) ??
    coerceNum((src as any)["コミュ力誤差"]);
  const updatePower =
    coerceNum(src.updatePower) ??
    coerceNum((src as any)["アップデート力"]);
  const genGap =
    coerceNum(src.genGap) ??
    coerceNum((src as any)["ジェネギャップ感覚"]);
  const harassmentAwareness =
    coerceNum(src.harassmentAwareness) ??
    coerceNum((src as any)["harassmentRisk"]) ??
    coerceNum((src as any)["無自覚ハラ傾向"]) ??
    coerceNum((src as any)["無自覚ハラスメント傾向"]);

  if (
    delegation == null ||
    orgDrag == null ||
    commGap == null ||
    updatePower == null ||
    genGap == null ||
    harassmentAwareness == null
  ) {
    return null;
  }

  return {
    delegation,
    orgDrag,
    commGap,
    updatePower,
    genGap,
    harassmentAwareness,
  };
}

type PageProps = { params: { rid: string } };

export default async function ReportPage({ params }: PageProps) {
  const r = Rid.safeParse(params.rid);
  if (!r.success) return notFound();
  const rid = r.data;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  if (!url || !key) {
    // 環境変数事故時は結果画面へ避難
    redirect(`/result?rid=${encodeURIComponent(rid)}`);
  }
  const supabase = createClient(url, key);

  // 1) まず diagnoses
  const { data: d1 } = await supabase
    .from("diagnoses")
    .select("id, company_size, normalized_scores, scores, categories_json, samurai_type, score_pattern")
    .eq("id", rid)
    .maybeSingle();

  // 2) 予備: samurairesults / samurai_results / results（列名ばらつき吸収）
  let d2: any = null;
  if (!d1) {
    const candidates = ["samurairesults", "samurai_results", "results"];
    for (const t of candidates) {
      const { data } = await supabase
        .from(t)
        .select("*")
        .or(`id.eq.${rid},uuid.eq.${rid},result_id.eq.${rid}`)
        .limit(1)
        .maybeSingle();
      if (data) { d2 = data; break; }
    }
  }

  const row = d1 ?? d2;
  if (!row) {
    // データが見つからないときは 404 にせず結果画面へ
    redirect(`/result?rid=${encodeURIComponent(rid)}`);
  }

  const scores = buildScores(row);
  if (!scores) {
    // スコア欠損時は結果画面へ（Finalize 未完の保険）
    redirect(`/result?rid=${encodeURIComponent(rid)}`);
  }

  // samurai_type が無ければ判定
  let sType: SamuraiType | undefined =
    typeof row.samurai_type === "string" && row.samurai_type
      ? (row.samurai_type as SamuraiType)
      : undefined;
  if (!sType) sType = judgeSamurai(scores!);

  const content = (TYPE_CONTENTS as Record<SamuraiType, any>)[sType!];
  if (!content) return notFound();

  const personal = getPersonalizedComments({
    scorePattern: coerceScorePattern(row.score_pattern),
    normalizedScores: scores!,
    maxItems: 2,
  });

  const openChat = {
    qrSrc: process.env.NEXT_PUBLIC_OPENCHAT_QR ?? undefined,
    linkHref: process.env.NEXT_PUBLIC_OPENCHAT_URL ?? undefined,
  };

  return (
    <main className="container py-6">
      <ReportTemplate
        diagId={rid}
        samuraiType={sType!}
        normalizedScores={scores!}
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
