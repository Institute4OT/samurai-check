// components/result/ResultPanel.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import ShareModal from '@/components/common/ShareModal';
import { Share2 } from 'lucide-react';
import FinalizeOnMount from '@/components/result/FinalizeOnMount';
import { normalizeToCatArray, resolveSamuraiType, getEmojiLabel } from '@/lib/result/normalize';
import { samuraiDescriptions } from '@/lib/samuraiJudge';
import IdBadge from '@/components/result/IdBadge';
import RidSync from '@/components/rid/RidSync';

type Props = {
  rid?: string; // 親から来ないことがあるので optional
  finalScores: Record<string, unknown> | null;
  samuraiType: string | null;
  comments: { strengths: string[]; tips: string[] };
  onRestart: () => void;
};

/* ===== ID判定 & 取得ヘルパー ===== */
function isIdish(v: string | null | undefined) {
  if (!v) return false;
  const s = v.trim();
  const uuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  const ulid = /^[0-9A-HJKMNP-TV-Z]{26}$/;
  const generic = /^[A-Za-z0-9_-]{16,}$/; // NanoID等
  return uuid.test(s) || ulid.test(s) || generic.test(s);
}
function readRidFromUrlQuery(): string | null {
  try {
    const u = new URL(window.location.href);
    const q = u.searchParams.get('rid') || u.searchParams.get('resultId') || u.searchParams.get('id');
    return q && q.trim() ? q.trim() : null;
  } catch { return null; }
}
function readRidFromUrlPath(): string | null {
  try {
    const segs = window.location.pathname.split('/').filter(Boolean);
    // 後ろから優先的に“IDらしい”セグメントを拾う
    for (let i = segs.length - 1; i >= 0; i--) {
      const s = decodeURIComponent(segs[i] || '');
      if (isIdish(s)) return s.trim();
    }
    return null;
  } catch { return null; }
}
function readRidFromStorages(): string | null {
  const keys = ['samurai:rid','samurai_last_rid','reportRid','resultId','rid'];
  for (const k of keys) {
    try { const v = localStorage.getItem(k);   if (isIdish(v)) return v!.trim(); } catch {}
    try { const v = sessionStorage.getItem(k); if (isIdish(v)) return v!.trim(); } catch {}
  }
  return null;
}
function readRidFromCookie(): string | null {
  try {
    const m = document.cookie.match(/(?:^|;\s*)samurai_rid=([^;]+)/);
    const v = m ? decodeURIComponent(m[1]) : null;
    return isIdish(v) ? v!.trim() : null;
  } catch { return null; }
}
function readRidFromReferrer(): string | null {
  try {
    const u = new URL(document.referrer);
    const cand = u.searchParams.get('rid') || u.searchParams.get('resultId') || u.searchParams.get('id');
    if (isIdish(cand)) return cand!.trim();
    // referrer のパスにも入っているかも
    const segs = u.pathname.split('/').filter(Boolean);
    for (let i = segs.length - 1; i >= 0; i--) {
      const s = decodeURIComponent(segs[i] || '');
      if (isIdish(s)) return s.trim();
    }
    return null;
  } catch { return null; }
}

export default function ResultPanel({
  rid: ridFromProps,
  finalScores,
  samuraiType,
  comments,
  onRestart,
}: Props) {
  // 親 > クエリ > パス > Storage > Cookie > Referrer の順で自己解決
  const [ridResolved, setRidResolved] = useState<string>(ridFromProps?.trim() || '');
  useEffect(() => {
    if (ridFromProps && isIdish(ridFromProps)) {
      setRidResolved(ridFromProps.trim());
      return;
    }
    const v =
      readRidFromUrlQuery() ||
      readRidFromUrlPath() ||
      readRidFromStorages() ||
      readRidFromCookie() ||
      readRidFromReferrer() ||
      '';
    if (v) setRidResolved(v);
  }, [ridFromProps]);

  // 見つかったら保存（フォーム連携の保険）
  useEffect(() => {
    if (!ridResolved) return;
    try {
      localStorage.setItem('samurai:rid', ridResolved);
      sessionStorage.setItem('samurai:rid', ridResolved);
      document.cookie = `samurai_rid=${encodeURIComponent(ridResolved)}; Path=/; Max-Age=1800; SameSite=Lax`;
    } catch {}
  }, [ridResolved]);

  const categoriesFixed = useMemo(() => normalizeToCatArray(finalScores), [finalScores]);
  const typeResolved = useMemo(() => resolveSamuraiType(samuraiType ?? ''), [samuraiType]);
  const displayName = typeResolved.display || samuraiType || '武将';
  const [shareOpen, setShareOpen] = useState(false);

  return (
    <div className="text-center max-w-4xl mx-auto p-8">
      <RidSync rid={ridResolved} />

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
          <h1 className="text-4xl md:text-5xl font-bold text-red-700 mb-2">{displayName}</h1>
          <p className="text-lg md:text-xl text-gray-700 leading-relaxed">
            {samuraiDescriptions[samuraiType as keyof typeof samuraiDescriptions] ?? ''}
          </p>

          {/* 結果ID表示（コピー付） */}
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

      {/* スコア */}
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
        <button
          onClick={() =>
            (window.location.href = `/form${ridResolved ? `?rid=${encodeURIComponent(ridResolved)}` : ''}`)
          }
          className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg text-lg transition-colors shadow-lg hover:shadow-xl"
        >
          あなた専用の詳細レポートを受け取る（無料）
        </button>
      </div>

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
