// app/report/[rid]/page.tsx
import "server-only";
import { createClient } from "@supabase/supabase-js";
import ReportTemplate from "@/components/report/ReportTemplate";
import { judgeSamurai } from "@/lib/samuraiJudge";
import { TYPE_CONTENTS } from "@/lib/report/typeContents";
import { getPersonalizedComments } from "@/lib/report/personalization";
import type {
  ScorePattern,
  SamuraiType,
  NormalizedCategoryScores,
} from "@/types/diagnosis";

export const dynamic = "force-dynamic";
export const revalidate = 0;

// ========== 画面内プレースホルダ（/result・404を止める） ==========
function renderPending(rid: string) {
  return (
    <main className="container mx-auto p-6">
      <h1 className="text-xl font-bold">詳細レポート</h1>
      <p>レポートデータを準備中です。（rid: {rid}）</p>
      <p className="text-sm text-slate-500 mt-2">数分後にもう一度お試しください。</p>
    </main>
  );
}
// ====================================================================

// ---- ユーティリティ
function num(v: unknown): number | null {
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}

function coerceScorePattern(v: any): ScorePattern {
  const keys = Array.from({ length: 16 }, (_, i) => `Q${i + 1}`);
  const out: Record<string, string> = {};
  for (const k of keys) {
    const raw = v?.[k];
    if (typeof raw === "string") out[k] = raw;
    else if (Array.isArray(raw) && typeof raw[0] === "string") out[k] = raw[0];
    else out[k] = "";
  }
  return out as ScorePattern;
}

function buildNormalizedScores(row: any): NormalizedCategoryScores | undefined {
  const src =
    row?.normalized_scores ??
    row?.scores ??
    row?.categories_json ??
    row;

  if (!src || typeof src !== "object") return undefined;

  const delegation = num(src.delegation);
  const orgDrag = num(src.org_evolution ?? src.orgDrag);
  const commGap = num(src.communication_gap ?? src.commGap);
  const updatePower = num(src.update_power);
  const genGap = num(src.gen_gap ?? src.genGap);
  const harassmentAwareness =
    num(src.harassmentAwareness) ??
    num(src.harassmentRisk) ??
    num(src["無自覚ハラ傾向"]);

  if (
    delegation == null ||
    orgDrag == null ||
    commGap == null ||
    updatePower == null ||
    genGap == null ||
    harassmentAwareness == null
  ) {
    return undefined;
  }

  return {
    delegation,
    orgDrag,
    commGap,
    updatePower,
    genGap,
    harassmentAwareness,
  } as NormalizedCategoryScores;
}

// ReportTemplate の content 期待形に合わせて不足キーを埋める
function toTemplateContent(raw: any) {
  return {
    catchcopy: raw?.catchcopy ?? "",
    growthPoints: Array.isArray(raw?.growthPoints) ? raw.growthPoints : [],
    story: raw?.story ?? "",
    actions: Array.isArray(raw?.actions) ? raw.actions : [],
    // 既存の他キーがあれば温存
    ...raw,
  } as any; // ← ReportTemplate 側の型に合わせるため any で受け渡し
}

type PageProps = { params: { rid: string } };

export default async function ReportPage({ params }: PageProps) {
  const rid = String((params as any)?.rid ?? "");
  if (!rid) return renderPending("");

  // Supabase（anon）で読み取り
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;
  if (!supabaseUrl || !supabaseAnonKey) return renderPending(rid);

  const supabase = createClient(supabaseUrl, supabaseAnonKey);

  // diagnoses / samurairesults を並列取得（どちらかあれば描画）
  const [{ data: diag }, { data: sres }] = await Promise.all([
    supabase.from("diagnoses").select("*").eq("id", rid).maybeSingle(),
    supabase.from("samurairesults").select("*").eq("id", rid).maybeSingle(),
  ]);

  const row: any = sres ?? diag;
  if (!row) return renderPending(rid);

  // スコア系を構築
  const scores = buildNormalizedScores(row);
  // タイプ（DBにあればそれを優先）
  let sType = (row?.samurai_type as SamuraiType | undefined) ?? undefined;

  // 無ければスコアから再判定（judgeSamurai は SamuraiType を返す）
  if (!sType && scores) {
    try {
      const judged = judgeSamurai(scores);
      sType = judged as SamuraiType;
    } catch {
      /* 失敗しても落とさない */
    }
  }

  if (!sType || !scores) return renderPending(rid);

  // コンテンツ（不足キーを補ってテンプレに渡す）
  const rawContent = TYPE_CONTENTS[sType as keyof typeof TYPE_CONTENTS];
  const contentForTemplate = toTemplateContent(rawContent);

  // パーソナライズ
  const personal = getPersonalizedComments({
    scorePattern: coerceScorePattern(row?.score_pattern),
    normalizedScores: scores,
    maxItems: 2,
  });

  // OpenChat リンク
  const openChat = {
    qrSrc: process.env.NEXT_PUBLIC_OPENCHAT_QR ?? undefined,
    linkHref: process.env.NEXT_PUBLIC_OPENCHAT_URL ?? undefined,
  };

  // 会社規模（出し分け用・未設定なら "unknown"）
  const companySize = (row?.company_size as string | undefined) ?? "unknown";

  // ---- 描画
  return (
    <main className="container mx-auto p-6">
      <ReportTemplate
        diagId={rid}
        samuraiType={sType as SamuraiType}
        normalizedScores={scores as NormalizedCategoryScores}
        companySize={companySize}
        content={contentForTemplate}      // ← 型不一致を解消
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
