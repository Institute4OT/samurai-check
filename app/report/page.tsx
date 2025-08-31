// app/report/page.tsx
import { notFound } from "next/navigation";
import ReportTemplate from "@/components/report/ReportTemplate";
import { createClient } from "@supabase/supabase-js";
import { calculateCategoryScores } from "@/lib/scoringSystem";

// 毎回最新を取得（SSR, キャッシュ無効化）
export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: { rid?: string };
};

type SamuraiResultRow = {
  id: string;
  name?: string | null;
  email?: string | null;
  company_size?: string | number | null;
  industry?: string | null;
  age_range?: string | null;
  samurai_type?: string | null;
  score_pattern?: unknown; // 文字列/配列/オブジェクト 何でも来る想定
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
    try {
      raw = JSON.parse(sp);
    } catch {
      raw = {};
    }
  }
  // 配列形式 [{q: "Q1", a:"..."}, ...] も吸収
  if (Array.isArray(raw)) {
    const obj: Record<string, string> = {};
    for (const item of raw as any[]) {
      const q = item?.q ?? item?.question ?? item?.questionId;
      const a = item?.a ?? item?.answer ?? item?.selectedAnswer ?? item?.selectedAnswers;
      if (q && a) obj[String(q)] = Array.isArray(a) ? String(a[0] ?? "") : String(a);
    }
    return obj;
  }
  if (raw && typeof raw === "object") {
    return raw as Record<string, string>;
  }
  return {};
}

/** scoringSystem が期待する [{questionId, selectedAnswers}] へ変換 */
function toSelections(answers: Record<string, string>) {
  const arr: { questionId: number; selectedAnswers: string[] }[] = [];
  for (const [key, val] of Object.entries(answers)) {
    // "Q12" → 12 / "12" → 12
    const m = String(key).match(/\d+/);
    const qid = m ? Number(m[0]) : Number(key);
    if (Number.isFinite(qid) && val) {
      arr.push({ questionId: qid, selectedAnswers: [val] });
    }
  }
  // questionId 昇順でお行儀よく
  arr.sort((a, b) => a.questionId - b.questionId);
  return arr;
}

export default async function Page({ searchParams }: PageProps) {
  const rid = searchParams?.rid?.trim();
  if (!rid) {
    notFound();
  }

  const supabase = createClient(
    mustEnv("NEXT_PUBLIC_SUPABASE_URL"),
    mustEnv("SUPABASE_SERVICE_ROLE_KEY")
  );

  const { data: result, error } = await supabase
    .from("samurairesults")
    .select("*")
    .eq("id", rid)
    .single<SamuraiResultRow>();

  if (error || !result) {
    notFound();
  }

  const answers = normalizeScorePattern(result.score_pattern);
  const selections = toSelections(answers);

  // scoringSystem は selections 配列を受け取る前提（スクショの型エラー準拠）
  const categories = calculateCategoryScores(selections);

  // company_size は string/number 両対応を吸収
  const companySize =
    typeof result.company_size === "number"
      ? String(result.company_size)
      : result.company_size ?? "";

  // ReportTemplate が要求するプロップは `data`
  const data = {
    // メタ
    resultId: result.id,
    createdAt: result.created_at ?? undefined,

    // 表示用 基本情報（テンプレ側で利用していれば拾えるように）
    name: result.name ?? "",
    email: result.email ?? "",
    companySize,
    industry: result.industry ?? "",
    ageRange: result.age_range ?? "",

    // レポート本体
    samuraiType: result.samurai_type ?? undefined, // テンプレ側で未設定フォールバックがあるなら undefined でもOK
    categories, // ← scoringSystemの戻り値（CategoryScore[] 想定）
    // 必要なら flags などもここで追加可能
    // flags: { manyZeroOnQ5: false, ... }
  };

  // 型のズレはテンプレ側に合わせて `data` を渡す。テンプレの型に厳密一致していなくても
  // 実行時は問題なく描画できるよう any を許容（スピード優先でエラー撲滅）
  return <ReportTemplate data={data as any} />;
}
