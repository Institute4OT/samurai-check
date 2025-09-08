// components/result/ResultPanel.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import ShareModal from '@/components/common/ShareModal';
import { Share2 } from 'lucide-react';
import FinalizeOnMount from '@/components/result/FinalizeOnMount';
import { normalizeToCatArray, resolveSamuraiType, getEmojiLabel } from '@/lib/result/normalize';
import { samuraiDescriptions } from '@/lib/samuraiJudge';

// 表示用バッジ（コピー付）
import IdBadge from '@/components/result/IdBadge';
// 保存用（localStorage / sessionStorage / cookie）
import RidSync from '@/components/rid/RidSync';

type Props = {
  rid?: string; // ← 親から来ない場合もあるので optional に
  finalScores: Record<string, unknown> | null;
  samuraiType: string | null;
  comments: { strengths: string[]; tips: string[] };
  onRestart: () => void;
};

/* ===== rid 再解決ヘルパー ===== */
function readRidFromUrl(): string | null {
  try {
    const u = new URL(window.location.href);
    return (
      u.searchParams.get('rid') ||
      u.searchParams.get('resultId') || // 旧表記の保険
      u.searchParams.get('id')
    );
  } catch { return null; }
}
function readRidFromStorages(): string | null {
  const keys = ['samurai:rid','samurai_last_rid','reportRid','resultId','rid'];
  for (const k of keys) {
    try { const v = localStorage.getItem(k);   if (v && v.trim()) return v.trim(); } catch {}
    try { const v = sessionStorage.getItem(k); if (v && v.trim()) return v.trim(); } catch {}
  }
  return null;
}
function readRidFromCookie(): string | null {
  try {
    const m = document.cookie.match(/(?:^|;\s*)samurai_rid=([^;]+)/);
    return m ? decodeURIComponent(m[1]) : null;
  } catch { return null; }
}
function readRidFromReferrer(): string | null {
  try {
    const u = new URL(document.referrer);
    return (
      u.searchParams.get('rid') ||
      u.searchParams.get('resultId') ||
      u.searchParams.get('id')
    );
  } catch { return null; }
}

export default function ResultPanel({
  rid: ridFromProps,
  finalScores,
  samuraiType,
  comments,
  onRestart,
}: Props) {
  // 1) 親からの rid を優先。無ければ自力解決
  const [ridResolved, setRidResolved] = useState<string>(ridFromProps?.trim() || '');

  useEffect(() => {
    if (ridFromProps) {
      setRidResolved(ridFromProps.trim());
      return;
    }
    const v =
      readRidFromUrl()?.trim() ||
      readRidFromStorages() ||
      readRidFromCookie() ||
      readRidFromReferrer() ||
      '';
    if (v) setRidResolved(v);
  }, [ridFromProps]);

  // 2) 見つかったら保存（フォーム連携の保険）
  useEffect(() => {
    if (!ridResolved) return;
    try {
      localStorage.setItem('samurai:rid', ridResolved);
      sessionStorage.setItem('samurai:rid', ridResolved);
      document.cookie = `samurai_rid=${encodeURIComponent(ridResolved)}; Path=/; Max-Age=1800; SameSite=Lax`;
    } catch {}
  }, [ridResolved]);

  // スコア（固定順の配列に正規化＋0..3クランプは normalize 側で実施）
  const categoriesFixed = useMemo(() => normalizeToCatArray(finalScores), [finalScores]);

  // タイプ名の最終表示（日本語 > 生文字 > 既定値）
  const typeResolved = useMemo(() => resolveSamuraiType(samuraiType ?? ''), [samuraiType]);
  const displayName = typeResolved.display || samuraiType || '武将';

  const [shareOpen, setShareOpen] = useState(false);

  return (
    <div className="text-center max-w-4xl mx-auto p-8">
      {/* 表示時に rid を同期（UIは出さない） */}
      <RidSync rid={ridResolved} />

      {/* DBスナップショット確定（UI非表示） */}
      {ridResolved && categoriesFixed.length > 0 && (
        <FinalizeOnMount
          rid={ridResolved}
          samuraiTypeKey={typeResolved.key}
          samuraiTypeJa={typeResolved.ja}
          categories={categoriesFixed.map((c) => ({ key: c.key, score: c.score }))}
        />
      )}

      <h2 className="text-2xl font-bold mb-8">診断結果</h2>

      {!!displayName && (
        <div className="mb-6 p-6 bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200 rounded-lg">
          <h1 className="text-4xl md:text-5xl font-bold text-red-700 mb-2">
            {displayName}
          </h1>
          <p className="text-lg md:text-xl text-gray-700 leading-relaxed">
            {samuraiDescriptions[samuraiType as keyof typeof samuraiDescriptions] ?? ''}
          </p>

          {/* 復活：カード内の結果ID表示（コピー付き） */}
          <div className="flex items-center justify-center mt-4">
            <IdBadge rid={ridResolved} />
          </div>

          <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
            <Button variant="secondary" onClick={() => setShareOpen(true)}>
              <Share2 className="w-4 h-4 mr-2" />
              あなたの武将型をシェアする
            </Button>
          </div>
        </div>
      )}

      <ShareModal
        open={shareOpen}
        onClose={() => setShareOpen(false)}
        text={`私は「${displayName}」型だったよ！武将タイプ診断やってみた😄`}
        subtitle="投稿前に内容をご確認ください。"
      />

      {/* スコア（固定順＋0〜3クランプ） */}
      <div className="space-y-4 text-left">
        <h3 className="text-xl font-semibold mb-4 text-center">カテゴリ別スコア（0〜3点）</h3>
        {categoriesFixed.map(({ key, label, score }) => {
          const emojiLabel = getEmojiLabel(score);
          const color =
            score >= 2.5 ? 'text-green-600'
            : score >= 2.0 ? 'text-yellow-600'
            : 'text-red-600';
          return (
            <div key={key} className="flex justify-between items-center p-3 bg-gray-50 rounded">
              <span className="font-medium">{label}</span>
              <div className="flex items-center">
                <span className={`text-lg font-bold ${color}`}>{Math.min(score, 3).toFixed(2)}点</span>
                <span className="text-sm font-medium text-gray-800 ml-2">{emojiLabel}</span>
              </div>
            </div>
          );
        })}
      </div>

      {(comments.strengths.length > 0 || comments.tips.length > 0) && (
        <div className="mt-8 text-left max-w-3xl mx-auto">
          <h3 className="text-lg font-semibold mb-2">🔍 あなたの特徴とヒント</h3>

          {comments.strengths.length > 0 && (
            <div className="mb-4">
              <h4 className="font-semibold text-green-700 mb-1">あなたの強み</h4>
              <ul className="list-disc list-inside text-green-800">
                {comments.strengths.map((item, idx) => (
                  <li key={`strength-${idx}`}>{item}</li>
                ))}
              </ul>
            </div>
          )}

          {comments.tips.length > 0 && (
            <div>
              <h4 className="font-semibold text-orange-700 mb-1">改善のヒント</h4>
              <ul className="list-disc list-inside text-orange-800">
                {comments.tips.map((item, idx) => (
                  <li key={`tip-${idx}`}>{item}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <div className="mt-12 text-center">
        <p className="text-gray-600 text-sm mb-2">※ご希望の方には、こんなレポートを無料でお届け！</p>
        <img
          src="/images/reportSample.png"
          alt="詳細レポートのサンプル画像"
          className="mx-auto w-[300px] rounded-lg shadow-md"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
        />
      </div>

      <div className="mt-8 space-y-4">
        <button
          onClick={onRestart}
          className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-lg text-lg transition-colors shadow-lg hover:shadow-xl mr-4"
        >
          もう一度診断する
        </button>
        {/* 申込導線は rid クエリで統一 */}
        <button
          onClick={() => (window.location.href = `/form${ridResolved ? `?rid=${encodeURIComponent(ridResolved)}` : ''}`)}
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg text-lg transition-colors shadow-lg hover:shadow-xl"
        >
          あなた専用の詳細レポートを受け取る（無料）
        </button>
      </div>

      {/* フッター：IOTロゴ＋著作権 */}
      <a
        href="https://ourdx-mtg.com/"
        target="_blank"
        rel="noopener noreferrer"
        className="mt-8 flex items-center justify-center text-gray-500 text-sm space-x-2 hover:text-gray-700"
      >
        <img
          src="/images/logo.png"
          alt="企業の未来づくり研究所ロゴ"
          className="w-[40px] h-auto opacity-70 hover:opacity-90"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.visibility = 'hidden'; }}
        />
        <span>© 一般社団法人 企業の未来づくり研究所</span>
      </a>
    </div>
  );
}
