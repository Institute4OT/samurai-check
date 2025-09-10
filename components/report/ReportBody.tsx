// /components/report/ReportBody.tsx
'use client';
import Image from 'next/image';
import { Card, CardContent } from '@/components/ui/card';
import type { NormalizedCategoryScores, SamuraiType } from '@/types/diagnosis';

export type TypeContent = {
  catchcopy: string;
  description: string;
  strengths: string[];
  pitfalls: string[];          // 落とし穴
  growthPoints: string[];      // 伸ばすべきポイント
  story: string[];             // 現代における成長ストーリー
  actions: string[];           // 具体アクション
};

export type PersonalComments = {
  gifts?: string[];            // 才能（2件推奨）
  challenges?: string[];       // 新たな挑戦のフィールド（2件推奨）
};

export type OpenChatInfo = {
  qrSrc?: string;              // 例: '/images/openchat_qr.png'（環境で差し替え）
  linkHref?: string;           // 例: process.env.NEXT_PUBLIC_OPENCHAT_URL
};

type Props = {
  samuraiType: SamuraiType;
  normalizedScores: NormalizedCategoryScores;
  content: TypeContent;        // lib/report/typeContents.ts の該当型を渡す
  personal?: PersonalComments; // personalization の結果
  openChat?: OpenChatInfo;
  labelMap?: Partial<Record<keyof NormalizedCategoryScores, string>>;
};

const DEFAULT_LABELS: Record<keyof NormalizedCategoryScores, string> = {
  delegation: '権限委譲・構造健全度',
  orgDrag: '組織進化阻害',
  commGap: 'コミュ力誤差',
  updatePower: 'アップデート力',
  genGap: 'ジェネギャップ感覚',
  harassmentAwareness: '無自覚ハラ傾向',
};

function top2Bottom2(scores: NormalizedCategoryScores) {
  const arr = (Object.entries(scores) as Array<[keyof NormalizedCategoryScores, number]>)
    .sort((a, b) => b[1] - a[1]);
  return { top2: arr.slice(0, 2), bottom2: arr.slice(-2) };
}

export default function ReportBody({
  samuraiType,
  normalizedScores,
  content,
  personal,
  openChat,
  labelMap,
}: Props) {
  const labels = { ...DEFAULT_LABELS, ...(labelMap ?? {}) };
  const { top2, bottom2 } = top2Bottom2(normalizedScores);

  // 個別コメントのフォールバック（回答データに基づく汎用文）
  const gifts = (personal?.gifts?.length ? personal.gifts : top2.map(([k]) => `「${labels[k]}」が高く、チームを前に進める強みとして機能しています。`)).slice(0, 2);
  const challenges = (personal?.challenges?.length ? personal.challenges : bottom2.map(([k]) => `「${labels[k]}」は伸びしろ領域。次の90日で小さく改善を積み上げましょう。`)).slice(0, 2);

  return (
    <div className="space-y-6">
      {/* キャッチコピー＋タイプ説明 */}
      <Card className="border rounded-2xl">
        <CardContent className="p-6 space-y-3">
          <h2 className="text-xl font-semibold">タイプ解説</h2>
          <p className="text-lg font-medium">{content.catchcopy}</p>
          <p className="text-sm leading-6 text-muted-foreground">{content.description}</p>
        </CardContent>
      </Card>

      {/* 長所・落とし穴・伸ばすべきポイント */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <Card className="border rounded-2xl">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold">長所</h3>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-sm">
              {content.strengths.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </CardContent>
        </Card>
        <Card className="border rounded-2xl">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold">落とし穴</h3>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-sm">
              {content.pitfalls.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </CardContent>
        </Card>
        <Card className="border rounded-2xl">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold">伸ばすべきポイント</h3>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-sm">
              {content.growthPoints.map((s, i) => <li key={i}>{s}</li>)}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* 成長ストーリー */}
      <Card className="border rounded-2xl">
        <CardContent className="p-6 space-y-2">
          <h3 className="text-lg font-semibold">現代における成長ストーリー</h3>
          <div className="space-y-2 text-sm leading-6">
            {content.story.map((p, i) => <p key={i}>{p}</p>)}
          </div>
        </CardContent>
      </Card>

      {/* 推奨アクション */}
      {content.actions.length > 0 && (
        <Card className="border rounded-2xl">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold">具体的なアクションプラン（90日）</h3>
            <ol className="list-decimal pl-5 mt-2 space-y-1 text-sm">
              {content.actions.map((a, i) => <li key={i}>{a}</li>)}
            </ol>
          </CardContent>
        </Card>
      )}

      {/* 個別コメント */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="border rounded-2xl">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold">あなたが持つ才能（ギフト）</h3>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-sm">
              {gifts.map((g, i) => <li key={i}>{g}</li>)}
            </ul>
          </CardContent>
        </Card>
        <Card className="border rounded-2xl">
          <CardContent className="p-6">
            <h3 className="text-lg font-semibold">新たな挑戦のフィールド</h3>
            <ul className="list-disc pl-5 mt-2 space-y-1 text-sm">
              {challenges.map((c, i) => <li key={i}>{c}</li>)}
            </ul>
          </CardContent>
        </Card>
      </div>

      {/* オープンチャット */}
      {(openChat?.qrSrc || openChat?.linkHref) && (
        <Card className="border rounded-2xl">
          <CardContent className="p-6 flex items-center gap-6">
            {openChat?.qrSrc && (
              <div className="w-32 h-32 relative">
                <Image src={openChat.qrSrc} alt="OpenChat QR" fill className="object-contain" sizes="128px" />
              </div>
            )}
            <div className="space-y-2">
              <h3 className="text-lg font-semibold">組織の成長に役立つ最新情報はオープンチャットで！</h3>
              {openChat?.linkHref && (
                <a className="underline text-sm" href={openChat.linkHref} target="_blank" rel="noopener noreferrer">
                  ▶ オープンチャットに参加する
                </a>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
