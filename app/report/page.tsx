import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import ReportTemplate from "@/components/report/ReportTemplate";
import { generatePersonalComments, AnswerLite } from "@/lib/comments/generatePersonalComments";

export const dynamic = "force-dynamic";

type PageProps = { searchParams: { rid?: string } };

type SamuraiResultRow = {
  id: string;
  name?: string | null;
  email?: string | null;
  company_name?: string | null;
  company_size?: string | number | null;
  industry?: string | null;
  age_range?: string | null;
  samurai_type?: string | null;
  score_pattern?: unknown;
  assigned_counselor?: string | null;
  created_at?: string | null;
};

function mustEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`Missing env: ${name}`);
  return v;
}

// ===== score_pattern を「設問ID:選択テキスト」へ正規化 =====
function normalizeAnswers(sp: unknown): Record<string, string> {
  let raw = sp;
  if (typeof sp === "string") {
    try { raw = JSON.parse(sp); } catch { raw = {}; }
  }
  if (Array.isArray(raw)) {
    const obj: Record<string, string> = {};
    for (const item of raw as any[]) {
      const q = item?.q ?? item?.question ?? item?.questionId;
      const a =
        item?.a ??
        item?.answer ??
        item?.selectedAnswer ??
        item?.selectedText ??
        item?.selectedAnswers;
      if (q != null && a != null) obj[String(q)] = Array.isArray(a) ? String(a[0] ?? "") : String(a);
    }
    return obj;
  }
  if (raw && typeof raw === "object") return raw as Record<string, string>;
  return {};
}

// A/B/C/D / 1..4 / 「2点」など ⇒ 0..3 へ
function to03(v: unknown): number {
  const s = String(v ?? "").trim();
  if (/^\d+$/.test(s)) {
    const n = Number(s);
    if (n >= 1 && n <= 4) return n - 1; // 1..4 体系は 0..3 に寄せる
    return Math.max(0, Math.min(3, n));
  }
  const m = s.match(/^[A-Da-d]$/);
  if (m) return m[0].toUpperCase().charCodeAt(0) - "A".charCodeAt(0);
  const pt = s.match(/([0-3])\s*点/);
  if (pt) return Number(pt[1]);
  const tail = s.match(/([0-3])(?!.*\d)/);
  if (tail) return Number(tail[1]);
  return 0;
}

// 既存テンプレが期待する {label, score}[] を生成
// ここはプロジェクト内のカテゴリ計算に接続していてもOK。
// 計算器が無い/壊れているときでも動くよう「安全版」平均化を用意。
function computeCategories(ans: Record<string, string>): { label: string; score: number }[] {
  // 仮のカテゴリ割り（安全版）：設問番号の mod で6カテゴリに散らす
  const labels = [
    "権限委譲・構造資産化",
    "アップデート力",
    "コミュニケーション",
    "無自覚ハラスメント傾向",
    "ジェネギャップ感覚",
    "組織進化阻害",
  ];
  const buckets = labels.map(() => [] as number[]);
  const entries = Object.entries(ans);
  for (const [k, v] of entries) {
    const id = Number(String(k).match(/\d+/)?.[0] ?? 0);
    const bucket = Number.isFinite(id) ? id % labels.length : 0;
    buckets[bucket].push(to03(v));
  }
  return buckets.map((arr, i) => ({
    label: labels[i],
    score: arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : 0,
  }));
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

  // ---- 回答 → カテゴリスコア ----
  const normalized = normalizeAnswers(result.score_pattern);
  const categories = computeCategories(normalized);

  // ---- 個別コメント（カテゴリ名は出さず、回答テキストベース 2件/2件）----
  const answersLite: AnswerLite[] = Object.entries(normalized).map(([k, v]) => {
    const m = String(k).match(/\d+/);
    return { id: m ? Number(m[0]) : Number(k), selectedText: String(v ?? ""), score: 0 };
  });
  const { talents, challenges } = generatePersonalComments(answersLite, 2);

  // ---- 表示データ（タイプは DB 値最優先。再計算しない）----
  const data = {
    resultId: result.id,
    createdAt: result.created_at ?? undefined,

    name: result.name ?? "",
    email: result.email ?? "",
    companyName: result.company_name ?? "",
    companySize: typeof result.company_size === "number" ? String(result.company_size) : (result.company_size ?? ""),
    industry: result.industry ?? "",
    ageRange: result.age_range ?? "",

    samuraiType: result.samurai_type ?? undefined, // ★これをそのままタイトルに

    categories,
    insights: { positives: talents, negatives: challenges },

    assignedCounselor: result.assigned_counselor ?? undefined,
  };

  return <ReportTemplate data={data as any} />;
}
