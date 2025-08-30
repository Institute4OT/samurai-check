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

function parsePattern(raw: unknown): Record<string, any> | null {
  if (!raw) return null;
  if (typeof raw === 'string') {
    try { return JSON.parse(raw); } catch { return null; }
  }
  return typeof raw === 'object' ? (raw as Record<string, any>) : null;
}

// 返却形の揺れを吸収して {delegation:number,...} に正規化
function extractScores(catAny: any): Record<string, number> {
  if (!catAny) return {};
  // 1) すでに number 直入れ
  if (typeof catAny.delegation === 'number') return catAny;

  // 2) scores フィールド
  if (catAny.scores && typeof catAny.scores.delegation === 'number') return catAny.scores;

  // 3) 各キーが {score:number}
  const keys = ['delegation','orgDrag','commGap','updatePower','genGap','harassmentRisk'];
  const out: Record<string, number> = {};
  let hit = false;
  for (const k of keys) {
    const v = catAny?.[k];
    if (v && typeof v.score === 'number') { out[k] = v.score; hit = true; }
  }
  if (hit) return out;

  // 4) 配列 [{key,score}]
  if (Array.isArray(catAny)) {
    for (const it of catAny) {
      if (it && typeof it.key === 'string' && typeof it.score === 'number') {
        out[it.key] = it.score; hit = true;
      }
    }
    if (hit) return out;
  }
  return {};
}

// CTA 出すか（閾値 51+ は元の仕様を踏襲）
function isLargeCompany(size?: string | null) {
  const s = (size || '').toString();
  return ['51-100', '101-300', '301-500', '501-1000', '1001+'].includes(s);
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

  // samurairesults 本体
  const { data: resRow } = await supabase
    .from('samurairesults')
    .select('*')
    .eq('id', resultId)
    .maybeSingle();

  if (!resRow) {
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
  const samuraiKey = normalizeSamuraiType((resRow as any).result_type ?? (resRow as any).samurai_type);

  // --- スコア計算（score_pattern→calculateCategoryScores） ---
  let scores: Record<string, number> = {};
  try {
    const pattern = parsePattern((resRow as any).score_pattern);
    if (pattern) {
      const catAny = (calculateCategoryScores as any)(pattern);
      scores = extractScores(catAny);
    }
  } catch (e) {
    console.error('[report] score calc error:', e);
    scores = {};
  }
  const pick = (k: string, def = 0) =>
    typeof scores?.[k] === 'number' ? scores[k] : def;

  // --- ReportTemplate 用データ ---
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
    flags: { manyZeroOnQ5: false, noRightHand: false }, // 必要に応じて差し替え
  };

  // --- CTA 表示用（どちらかに入っていればOK） ---
  const companySize = (resRow as any).company_size ?? intake?.company_size ?? null;
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
