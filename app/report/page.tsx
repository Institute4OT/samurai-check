// app/report/page.tsx
import React from 'react';
import { createClient } from '@supabase/supabase-js';
import ReportTemplate, { ReportInput } from '@/components/report/ReportTemplate';
import { calculateCategoryScores } from '@/lib/scoringSystem';
import { JA_TO_KEY, type SamuraiKey } from '@/lib/samuraiTypeMap';
import { bookingUrlFor } from '@/lib/emailTemplates';

export const dynamic = 'force-dynamic';
export const revalidate = 0;

type Search = { resultId?: string };

// --- ヘルパ ---
const ALL_KEYS = [
  'sanada','oda','hideyoshi','ieyasu','uesugi','saito','imagawa'
] as const;

function normalizeSamuraiType(val: unknown): SamuraiKey {
  const s = String(val ?? '').trim();
  if ((ALL_KEYS as readonly string[]).includes(s as any)) return s as SamuraiKey;
  const mapped = (JA_TO_KEY as Record<string, string | undefined>)[s];
  return (mapped ?? 'imagawa') as SamuraiKey; // デフォルトはお好みで
}

/* === スコア抽出ヘルパ === */
function parsePattern(raw: unknown): any | null {
  if (!raw) return null;
  if (typeof raw === 'string') { try { return JSON.parse(raw); } catch { return null; } }
  if (typeof raw === 'object') return raw as any;
  return null;
}

function extractCategoryScoresViaLib(pattern: any): Record<string, number> {
  // calculateCategoryScores の戻りの形揺れを全部吸収
  try {
    const any = (calculateCategoryScores as any)(pattern);
    const src = any?.scores ?? any;
    const pick = (k: string) => {
      const v = src?.[k];
      if (typeof v === 'number') return v;
      if (typeof v?.score === 'number') return v.score;
      return undefined;
    };
    const out: Record<string, number> = {};
    ['delegation','orgDrag','commGap','updatePower','genGap','harassmentRisk'].forEach(k => {
      const n = pick(k);
      if (typeof n === 'number') out[k] = n;
    });
    return out;
  } catch { return {}; }
}

function isLargeCompany(size?: string | null): boolean {
  if (!size) return false;
  // 例: "301〜500名" / "101-300" / "1001+" など → 数字を全部抜き出して最大を見る
  const nums = (String(size).match(/\d+/g) || []).map(n => Number(n)).filter(n => !Number.isNaN(n));
  if (!nums.length) return false;
  return Math.max(...nums) >= 51;
}


export default async function ReportPage({ searchParams }: { searchParams: Search }) {
  const resultId = searchParams?.resultId?.trim();
  if (!resultId) {
    return (
      <main className="mx-auto max-w-3xl p-6">
        <h1 className="text-2xl font-bold mb-2">診断レポートが見つかりません</h1>
        <p className="text-sm text-muted-foreground">
          URLに <code>resultId</code> が付いていません。
        </p>
      </main>
    );
  }

  // Supabase（型は any で安全運転）
  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
  );

// samurairesults を取得
const { data: row, error: rowErr } = await supabase
  .from('samurairesults')
  .select('id, created_at, result_type, samurai_type, company_size, score_pattern')
  .eq('id', resultId)
  .maybeSingle();

if (rowErr) {
  console.error('[report] samurairesults fetch error:', rowErr);
}

if (!row) {
  return (
    <main className="mx-auto max-w-3xl p-6">
      <h1 className="text-2xl font-bold mb-2">診断レポートが見つかりません</h1>
      <p className="text-sm text-muted-foreground">
        resultId=<code>{resultId}</code> のデータが存在しません。
      </p>
    </main>
  );
}

  // 直近の consult_intake（あれば上書き材料に使う）
  const { data: intakeRows } = await supabase
    .from('consult_intake')
    .select('result_id, company_size, email, name')
    .eq('result_id', resultId)
    .order('created_at', { ascending: false })
    .limit(1);

  const intake = (intakeRows?.[0] ?? null) as any;

  // --- 武将タイプ ---
  /* === ReportPage 内：DB取得後の組み立て部分で === */
  const samuraiKey = normalizeSamuraiType(row.result_type ?? row.samurai_type);
  const pattern = parsePattern(row.score_pattern);

  // ここでしっかり数値化
  const scores = pattern ? extractCategoryScoresViaLib(pattern) : {};
  const pick = (k: string, def = 0) => (typeof scores[k] === 'number' ? scores[k] : def);

  const reportData: ReportInput = {
    resultId,
    samuraiType: samuraiKey,
    categories: [
      { key: 'delegation',      label: '権限委譲・構造健全度', score: pick('delegation') },
      { key: 'orgDrag',         label: '組織進化阻害',         score: pick('orgDrag') },
      { key: 'commGap',         label: 'コミュ力誤差',         score: pick('commGap') },
      { key: 'updatePower',     label: 'アップデート力',       score: pick('updatePower') },
      { key: 'genGap',          label: 'ジェネギャップ感覚',   score: pick('genGap') },
      { key: 'harassmentRisk',  label: 'ハラスメント傾向',     score: pick('harassmentRisk') },
    ],
    flags: { manyZeroOnQ5: false, noRightHand: false },
  };

  // CTA判定は samurairesults.company_size と consult_intake.company_size のどちらかで
  const companySize = row.company_size ?? intake?.company_size ?? null;
  const email = intake?.email ?? null;
  const showCTA = isLargeCompany(companySize);

  return (
    <div>
      <ReportTemplate data={reportData} />

      {showCTA && (
        <section className="mx-auto max-w-4xl p-6">
          <div className="rounded-2xl border bg-card shadow-sm p-6">
            <h2 className="text-xl font-semibold mb-2">無料個別相談（読み解き＆次の一手）</h2>
            <p className="text-sm text-muted-foreground mb-4">
              組織規模が51名以上の方向けに、レポート読み解き／90日アクションの叩き台をご一緒します。
            </p>
            <a
              className="inline-block rounded-xl px-4 py-2 bg-black text-white"
              href={bookingUrlFor(undefined, resultId, email ?? undefined)}
            >
              予約ページを開く
            </a>
            <p className="text-xs text-muted-foreground mt-2">※ resultId / email を自動引き継ぎます</p>
          </div>
        </section>
      )}
    </div>
  );
}
