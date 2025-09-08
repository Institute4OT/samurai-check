// app/report/[rid]/page.tsx
import { notFound } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import ReportTemplate, { type ReportInput } from "@/components/report/ReportTemplate";
import { readSnapshot } from "@/lib/scoreSnapshot";

export const dynamic = "force-dynamic";

type PageProps = { params: { rid: string } };

function envOrThrow(...names: string[]) {
  for (const n of names) {
    const v = process.env[n];
    if (v) return v;
  }
  throw new Error(`Missing env: ${names.join(" or ")}`);
}

const supabase = createClient(
  envOrThrow("NEXT_PUBLIC_SUPABASE_URL"),
  envOrThrow("NEXT_PUBLIC_SUPABASE_ANON_KEY", "SUPABASE_ANON_KEY", "SUPABASE_SERVICE_ROLE_KEY"),
  { auth: { persistSession: false } }
);

export default async function Page({ params }: PageProps) {
  const rid = decodeURIComponent(params.rid || "").trim();
  if (!rid) notFound();

  const { data: row, error } = await supabase
    .from("samurairesults")
    .select("*")
    .eq("id", rid)
    .single();

  if (error || !row) notFound();

  const snap = readSnapshot(row);
  const samuraiType =
    snap.samuraiTypeJa ??
    snap.samuraiTypeKey ??
    (typeof row.samurai_type === "string" ? row.samurai_type : "");

  const data: ReportInput = {
    resultId: rid,
    samuraiType,
    categories: snap.categories,
    flags: {
      manyZeroOnQ5: !!row.flag_manyZeroOnQ5,
      noRightHand: !!row.flag_noRightHand,
    },
    personalComments: undefined,
    companySize: typeof row.company_size === "number" ? String(row.company_size) : (row.company_size ?? ""),
  };

  return <ReportTemplate data={data} />;
}
