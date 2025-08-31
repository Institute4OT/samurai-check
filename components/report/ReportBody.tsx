// components/report/ReportBody.tsx
'use client';

import React, { useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Smile, Target, Compass } from 'lucide-react';
import {
  ResponsiveContainer,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
} from 'recharts';

import { TYPE_CONTENTS } from '@/lib/report/typeContents';
import { kabutoSrcByType, SamuraiLabel } from '@/lib/report/kabutoMap';
import { genScoreFallbackBullets } from '@/lib/report/personalization';
import {
  normalizeCategories,
  clamp03,
  type CategoryScore,
} from '@/lib/report/categoryNormalize';

import {
  JA_TO_KEY,
  KEY_TO_JA,
  type SamuraiJa,
  type SamuraiKey,
} from '@/lib/samuraiTypeMap';

export type PersonalComments = {
  talents: string[];
  challenges: string[];
};

export type ReportInput = {
  resultId: string;
  samuraiType: SamuraiJa | SamuraiKey; // 日本語名 or key
  categories: unknown;                  // 受け取りは不定形でOK（本文内で正規化）
  flags?: { manyZeroOnQ5?: boolean; noRightHand?: boolean };
  personalComments?: PersonalComments;
  companySize?: string;
};

const SAMURAI_KEYS: SamuraiKey[] = [
  'sanada',
  'oda',
  'hideyoshi',
  'ieyasu',
  'uesugi',
  'saito',
  'imagawa',
];
const isKey = (v: any): v is SamuraiKey => SAMURAI_KEYS.includes(v);

// 見出しだけ共通フレーズ
const COMMON_BY_TYPE: Record<SamuraiJa, { headline: string }> = {
  今川義元型: { headline: '旧体制に安住しがちな安定志向タイプ' },
  織田信長型: { headline: '革新を突き進むトップダウン型' },
  豊臣秀吉型: { headline: '共創と巻き込みで勢いを生むタイプ' },
  真田幸村型: { headline: '柔軟さと進化力を兼ね備えた理想型' },
  斎藤道三型: { headline: '強引な支配で突き進む独裁型' },
  上杉謙信型: { headline: '高潔な精神を大切にする義将型' },
  徳川家康型: { headline: '慎重に構造を整える守りの型' },
};

export default function ReportBody({ data }: { data: ReportInput }) {
  // 1) タイプ名を正規化（key/ja）
  const { typeKey, typeJa } = useMemo(() => {
    const raw = data.samuraiType as SamuraiJa | SamuraiKey;
    const key: SamuraiKey = isKey(raw) ? raw : (JA_TO_KEY[raw as SamuraiJa] ?? 'oda');
    const ja: SamuraiJa = KEY_TO_JA[key] ?? '織田信長型';
    return { typeKey: key, typeJa: ja };
  }, [data.samuraiType]);

  // 2) カテゴリ→正規化→レーダー用
  const categories = useMemo<CategoryScore[]>(() => normalizeCategories(data.categories), [data.categories]);

  const chartData = useMemo(
    () =>
      categories.map((c) => ({
        subject: c.label,
        score: clamp03(c.score),
      })),
    [categories]
  );

  // 3) 個別コメント（personal > fallback）
  const fallback = useMemo(
    () => genScoreFallbackBullets({ categories, flags: data.flags }),
    [categories, data.flags]
  );

  const strengths = data.personalComments?.talents?.length
    ? data.personalComments.talents
    : fallback.strengths;

  const improvements = data.personalComments?.challenges?.length
    ? data.personalComments.challenges
    : fallback.improvements;

  const personal = { strengths, improvements, notes: fallback.notes };

  // 4) タイプ別テキスト
  const typeJaForDict = typeJa as unknown as SamuraiLabel;
  const kabutoSrc = kabutoSrcByType[typeJaForDict] ?? '/images/kabuto/oda.svg';
  const detail = TYPE_CONTENTS[typeJaForDict];
  const common = COMMON_BY_TYPE[typeJa];

  return (
    <div id="print-root" className="printable-root">
      {/* === ヘッダ === */}
      <header className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <img
            src={kabutoSrc}
            alt={`${typeJa} の兜`}
            className="h-12 w-12 object-contain shrink-0"
          />
        <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight">
              {typeJa} レポート
            </h1>
            <p className="text-sm text-muted-foreground mt-1">結果ID：{data.resultId}</p>
          </div>
        </div>
        <img src="/images/logo.png" alt="IOT ロゴ" className="h-8 w-auto opacity-90" />
      </header>

      {/* レーダーチャート */}
      <Card className="rounded-2xl border shadow-sm mt-3 break-inside-avoid">
        <CardContent className="px-6 py-4">
          <h2 className="text-base sm:text-lg font-semibold mb-2 flex items-center gap-2">
            <Compass className="w-5 h-5" /> スコア可視化（0–3）
          </h2>
          <div className="w-full h-56 sm:h-60">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={chartData} margin={{ top: 4, right: 8, bottom: 4, left: 8 }}>
                <PolarGrid />
                <PolarAngleAxis dataKey="subject" />
                <PolarRadiusAxis angle={30} domain={[0, 3]} />
                <Radar name="Score" dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.35} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* とは？（headline + description） */}
      <Card className="rounded-2xl border shadow-sm mt-4 break-inside-avoid">
        <CardContent className="p-6 space-y-3">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <Smile className="w-5 h-5" /> {typeJa} とは？
          </h2>
          <p className="text-base font-medium">{common?.headline}</p>
          {detail?.description && (
            <p className="text-sm leading-6 text-muted-foreground">{detail.description}</p>
          )}
        </CardContent>
      </Card>

      {/* タイプ別 詳細 */}
      {detail && (
        <>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
            <Card className="rounded-2xl border shadow-sm break-inside-avoid">
              <CardContent className="p-6 space-y-2">
                <h3 className="font-semibold">〔長所〕</h3>
                <ul className="list-disc pl-5 space-y-1">
                  {detail.strengths.map((t: string, i: number) => (
                    <li key={`st-${i}`} className="text-sm leading-6">{t}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
            <Card className="rounded-2xl border shadow-sm break-inside-avoid">
              <CardContent className="p-6 space-y-2">
                <h3 className="font-semibold">〔落とし穴〕</h3>
                <ul className="list-disc pl-5 space-y-1">
                  {detail.pitfalls.map((t: string, i: number) => (
                    <li key={`pf-${i}`} className="text-sm leading-6">{t}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          </div>

          <Card className="rounded-2xl border shadow-sm mt-4 break-inside-avoid">
            <CardContent className="p-6 space-y-2">
              <h3 className="font-semibold">〔伸ばすべきポイント〕</h3>
              <ol className="list-decimal pl-5 space-y-1">
                {detail.shouldFocus.map((t: string, i: number) => (
                  <li key={`sf-${i}`} className="text-sm leading-6">{t}</li>
                ))}
              </ol>
            </CardContent>
          </Card>

          {detail.growthStory && (
            <Card className="rounded-2xl border shadow-sm mt-4 break-inside-avoid">
              <CardContent className="p-6 space-y-2">
                <h3 className="font-semibold">〔現代における成長ストーリー〕</h3>
                <p className="text-sm leading-7 text-muted-foreground">{detail.growthStory}</p>
              </CardContent>
            </Card>
          )}

          {detail.actionPlan?.length ? (
            <Card className="rounded-2xl border shadow-sm mt-4 break-inside-avoid">
              <CardContent className="p-6 space-y-2">
                <h3 className="font-semibold">〔具体的なアクションプラン〕</h3>
                <ul className="list-disc pl-5 space-y-1">
                  {detail.actionPlan.map((t: string, i: number) => (
                    <li key={`ap-${i}`} className="text-sm leading-6">{t}</li>
                  ))}
                </ul>
              </CardContent>
            </Card>
          ) : null}

          {detail.connector && (
            <p className="mt-6 text-sm leading-7 text-gray-600">{detail.connector}</p>
          )}
        </>
      )}

      {/* 個別コメント（自分だけのパート） */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
        <Card className="rounded-2xl border shadow-sm break-inside-avoid">
          <CardContent className="p-6 space-y-1">
            <h3 className="font-semibold flex items-center gap-2">
              <Target className="w-5 h-5" /> あなたが持つ才能（ギフト）
            </h3>
            <p className="text-xs text-muted-foreground">※ あなたの回答から抽出した“いま効いている強み”</p>
            <ul className="list-disc pl-5 space-y-1 mt-1">
              {personal.strengths.map((t: string, i: number) => (
                <li key={`ps-${i}`} className="text-sm leading-6">{t}</li>
              ))}
            </ul>
          </CardContent>
        </Card>

        <Card className="rounded-2xl border shadow-sm break-inside-avoid">
          <CardContent className="p-6 space-y-1">
            <h3 className="font-semibold flex items-center gap-2">
              <Target className="w-5 h-5" /> 新たな挑戦のフィールド
            </h3>
            <p className="text-xs text-muted-foreground">※ 次の90日で磨くと効果が高いテーマ</p>
            <ul className="list-disc pl-5 space-y-1 mt-1">
              {personal.improvements.map((t: string, i: number) => (
                <li key={`pi-${i}`} className="text-sm leading-6">{t}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      </div>

      {personal.notes.length > 0 && (
        <Card className="rounded-2xl border shadow-sm mt-4 break-inside-avoid">
          <CardContent className="p-6 space-y-2">
            <h3 className="font-semibold">補足メモ</h3>
            <ul className="list-disc pl-5 space-y-1">
              {personal.notes.map((n: string, i: number) => (
                <li key={`pn-${i}`} className="text-sm leading-6">{n}</li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
