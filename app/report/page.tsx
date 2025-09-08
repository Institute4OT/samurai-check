// app/report/page.tsx
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import ReportTemplate, { type ReportInput } from "@/components/report/ReportTemplate";
import { readSnapshot } from "@/lib/scoreSnapshot";

export const dynamic = "force-dynamic";

type PageProps = { searchParams?: Record<string, string | string[] | undefined> };

function envOrThrow(...names: string[]) {
  for (const n of names) {
    const v = process.env[n];
    if (v) return v;
  }
  throw new Error(`Missing env: ${names.join(" or ")}`);
}

const supabase = createClient(
  envOrThrow("NEXT_PUBLIC_SUPABASE_URL"),
  // 読み取り専用：ANON優先／なければSERVICE_ROLEでも可（サーバ実行のため）
  envOrThrow("NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"),
  { auth: { persistSession: false } }
);

// rid / resultId / id のいずれかから拾う
function pickRid(sp?: PageProps["searchParams"]): string {
  const val =
    (typeof sp?.rid === "string" && sp?.rid) ||
    (typeof sp?.resultId === "string" && sp?.resultId) ||
    (typeof sp?.id === "string" && sp?.id) ||
    "";
  return val.trim();
}

export default async function Page({ searchParams }: PageProps) {
  const rid = pickRid(searchParams);
  if (!rid) notFound();

  // 1) 結果行だけ取得（計算はしない）
  const { data: row, error } = await supabase
    .from("samurairesults")
    .select("*")
    .eq("id", rid)
    .maybeSingle();

  if (error || !row) notFound();

  // 2) 保存済みスナップショットを利用（なければ旧カラムから復元）
  const snap = readSnapshot(row);

  const samuraiType =
    snap.samuraiTypeJa ??
    snap.samuraiTypeKey ??
    (typeof (row as any).samurai_type === "string" ? (row as any).samurai_type : "");

  // 3) テンプレに渡すデータ
  const data: ReportInput = {
    resultId: rid,
    samuraiType,
    categories: snap.categories,
    flags: {
      manyZeroOnQ5: !!(row as any).flag_manyZeroOnQ5,
      noRightHand: !!(row as any).flag_noRightHand,
    },
    personalComments: undefined,
    companySize:
      typeof (row as any).company_size === "number"
        ? String((row as any).company_size)
        : ((row as any).company_size ?? ""),
  };

  return <ReportTemplate data={data} />;
}
