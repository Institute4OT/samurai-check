// components/result/FinalizeOnMount.tsx
'use client';

import { useEffect, useRef } from 'react';
import type { CatItem, CatKey } from '@/lib/scoreSnapshot'; // ← 既に作成済みの型を再利用

type Props = {
  rid: string;
  samuraiTypeKey?: string; // 例: 'sanada'
  samuraiTypeJa?: string;  // 例: '真田幸村型'
  /** レーダー用の確定カテゴリ [{ key, score }] 最低限この形があればOK */
  categories: Array<Pick<CatItem, 'key' | 'score'>>;
};

export default function FinalizeOnMount({
  rid,
  samuraiTypeKey,
  samuraiTypeJa,
  categories,
}: Props) {
  const once = useRef(false);

  useEffect(() => {
    if (once.current) return;
    once.current = true;

    // 体感高速化：直近スコアを保存（レポート側で上書き表示に使える）
    try {
      const simple = categories.map(c => ({ key: c.key, score: clamp03(c.score) }));
      localStorage.setItem('lastScores', JSON.stringify(simple));
    } catch {}

    // サーバ確定（既に確定済みならAPI側で無視されます）
    (async () => {
      try {
        const body = {
          rid,
          samuraiTypeKey,
          samuraiTypeJa,
          categories: categories.map((c) => ({
            key: c.key,
            score: clamp03(c.score),
          })),
        };
        await fetch('/api/results/finalize', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify(body),
        });
      } catch (e) {
        // エラーでもUIは止めない（監査ログはサーバ側で）
        console.error('[finalize] failed:', e);
      }
    })();
  }, [rid, samuraiTypeKey, samuraiTypeJa, categories]);

  return null;
}

function clamp03(n: unknown): number {
  const v = typeof n === 'number' ? n : Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(3, v));
}
