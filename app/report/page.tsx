// app/report/page.tsx
import { notFound } from "next/navigation";
import ReportTemplate from "@/components/report/ReportTemplate";
import { createClient } from "@supabase/supabase-js";
import { calculateCategoryScores } from "@/lib/scoringSystem";
import { generatePersonalComments } from "@/lib/comments/generatePersonalComments";

export const dynamic = "force-dynamic";

type PageProps = { searchParams: { rid?: string } };

type SamuraiResultRow = {
  id: string;
  name?: string | null;
  email?: string | null;
  company_size?: string | number | null;
  company_name?: string | null;
  industry?: string | null;
  age_range?: string | null;
  samurai_type?: string | null;
  score_pattern?: unknown;
  assigned_counselor?: "ishijima" | "morigami" | null;
  created_at?: string | null;
  updated_at?: string | null;
};

function mustEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

/** 文字列/配列/オブジェクト いずれでも Q→選択肢テキスト に正規化 */
function normalizeScorePattern(sp: unknown): Record<string, string> {
  let raw = sp;
  if (typeof sp === "string") {
    try { raw = JSON.parse(sp); } catch { raw = {}; }
  }
  if (Array.isArray(raw)) {
    const obj: Record<string, string> = {};
    for (const item of raw as any[]) {
      const q = item?.q ?? item?.question ?? item?.questionId;
      const a = item?.a ?? item?.answer ?? item?.selectedAnswer ?? item?.selectedAnswers;
      if (q && a) obj[String(q)] = Array.isArray(a) ? String(a[0] ?? "") : String(a);
    }
    return obj;
  }
  if (raw && typeof raw === "object") return raw as Record<string, string>;
  return {};
}

/** scoringSystem が期待する [{questionId, selectedAnswers}] へ変換（レーダー用） */
function toSelections(answers: Record<string, string>) {
  const arr: { questionId: number; selectedAnswers: string[] }[] = [];
  for (const [key, val] of Object.entries(answers)) {
    const m = String(key).match(/\d+/);
    const qid = m ? Number(m[0]) : Number(key);
    if (Number.isFinite(qid) && val) arr.push({ questionId: qid, selectedAnswers: [val] });
  }
  arr.sort((a, b) => a.questionId - b.questionId);
  return arr;
}

function clamp0to3(n: any) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(3, x));
}

/** scoring の戻りが配列/オブジェクトでも「{label,score}[]」に整える（レーダー安定化） */
function ensureCategoryArray(scored: any): { label: string; score: number }[] {
  if (Array.isArray(scored)) {
    return scored.map((it: any, i: number) => {
      const label =
        it?.label ?? it?.name ?? it?.category ?? it?.key ?? `Category ${i + 1}`;
      const score = it?.score ?? it?.value ?? it?.point ?? it?.points ?? it?.raw ?? it;
      return { label: String(label), score: clamp0to3(score) };
    });
  }
  if (scored?.categories && Array.isArray(scored.categories)) {
    return ensureCategoryArray(scored.categories);
  }
  if (scored && typeof scored === "object") {
    return Object.entries(scored).map(([k, v]) => ({
      label: String(k),
      score: clamp0to3((v as any)?.score ?? v),
    }));
  }
  return [];
}

export default async function Page({ searchParams }: PageProps) {
  const rid = searchParams?.rid?.trim();
  if (!rid) notFound();

  const supabase = createClient(
    mustEnv("NEXT_PUBLIC_SUPABASE_URL"),
    mustEnv("SUPABASE_SERVICE_ROLE_KEY"),
    { auth: { persistSession: false } }
  );

  const { data: result, error } = await supabase
    .from("samurairesults")
    .select("*")
    .eq("id", rid)
    .single<SamuraiResultRow>();

  if (error || !result) notFound();

  // ---- 回答（Q→選択肢テキスト）を正規化 ----
  const answers = normalizeScorePattern(result.score_pattern);

  // ---- レーダー用：スコア計算（従来どおり） ----
  const selections = toSelections(answers);
  const scoredRaw: unknown = calculateCategoryScores(selections);
  const categoriesBase = ensureCategoryArray(scoredRaw);
  const categories = categoriesBase.map((c, i) => {
    const label = c?.label ? String(c.label) : `Category ${i + 1}`;
    const score = clamp0to3(c?.score);
    // ReportTemplate 内の参照ゆらぎ対策（label/name/key/category 全て埋める）
    return { label, name: label, key: label, category: label, score };
  });

  // ---- 詳細レポート用：回答ベースの個別コメント（カテゴリ名は出さない） ----
  const answersLite = Object.entries(answers).map(([k, v]) => {
    const m = String(k).match(/\d+/);
    const id = m ? Number(m[0]) : Number(k);
    return { id, selectedText: String(v ?? ""), score: 0 };
  });
  const { talents, challenges } = generatePersonalComments(answersLite, 2);
  const insights = { positives: talents, negatives: challenges };

  const companySize =
    typeof result.company_size === "number"
      ? String(result.company_size)
      : result.company_size ?? "";

  const data = {
    resultId: result.id,
    createdAt: result.created_at ?? undefined,

    name: result.name ?? "",
    email: result.email ?? "",
    companyName: result.company_name ?? "",
    companySize,
    industry: result.industry ?? "",
    ageRange: result.age_range ?? "",

    samuraiType: result.samurai_type ?? undefined,
    categories,               // レーダー
    insights,                 // ← これをテンプレの「プラス／マイナス」枠に表示（カテゴリ名は出さない）
    assignedCounselor: result.assigned_counselor ?? undefined,
  };

  return <ReportTemplate data={data as any} />;
}
