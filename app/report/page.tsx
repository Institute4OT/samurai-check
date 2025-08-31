// app/report/page.tsx
import { notFound } from "next/navigation";
import ReportTemplate from "@/components/report/ReportTemplate";
import { createClient } from "@supabase/supabase-js";
import { calculateCategoryScores } from "@/lib/scoringSystem";

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

function clamp01to3(n: any) {
  const x = Number(n);
  if (!Number.isFinite(x)) return 0;
  return Math.max(0, Math.min(3, x));
}

/** scoring の戻りが配列/オブジェクト/ラッパーのどれでも「{label, score}[]」に整える */
function ensureCategoryArray(scored: any): { label: string; score: number }[] {
  // 1) そのまま配列
  if (Array.isArray(scored)) {
    return scored
      .map((it: any, i: number) => {
        const label =
          it?.label ?? it?.name ?? it?.category ?? it?.key ?? `Category ${i + 1}`;
        const score =
          it?.score ?? it?.value ?? it?.point ?? it?.points ?? it?.raw ?? it;
        return { label: String(label), score: clamp01to3(score) };
      })
      .filter((x: any) => typeof x.label === "string");
  }
  // 2) { categories: [...] } 形式
  if (scored?.categories && Array.isArray(scored.categories)) {
    return ensureCategoryArray(scored.categories);
  }
  // 3) { key: number | {score: number} } 形式
  if (scored && typeof scored === "object") {
    return Object.entries(scored).map(([k, v]) => ({
      label: String(k),
      score: clamp01to3((v as any)?.score ?? v),
    }));
  }
  // 4) それ以外は空
  return [];
}

export default async function Page({ searchParams }: PageProps) {
  const rid = searchParams?.rid?.trim();
  if (!rid) notFound();

  const supabase = createClient(
    mustEnv("NEXT_PUBLIC_SUPABASE_URL"),
    mustEnv("SUPABASE_SERVICE_ROLE_KEY")
  );

  const { data: result, error } = await supabase
    .from("samurairesults")
    .select("*")
    .eq("id", rid)
    .single<SamuraiResultRow>();

  if (error || !result) notFound();

  const answers = normalizeScorePattern(result.score_pattern);
  const selections = toSelections(answers);

  const rawScore: unknown = calculateCategoryScores(selections);
  const categories = ensureCategoryArray(rawScore);
  const flags =
    Array.isArray(rawScore)
      ? undefined
      : (rawScore && typeof rawScore === "object" && "flags" in (rawScore as any)
          ? (rawScore as any).flags
          : undefined);

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
    categories,
    flags,
    assignedCounselor: result.assigned_counselor ?? undefined,
  };

  return <ReportTemplate data={data as any} />;
}
