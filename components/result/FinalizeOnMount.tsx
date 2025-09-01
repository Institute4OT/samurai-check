// components/result/FinalizeOnMount.tsx
'use client';

import { useEffect, useRef } from 'react';
import type { CatItem } from '@/lib/scoreSnapshot';

type Props = {
  /** 診断結果ID（必須） */
  rid: string;
  /** 表示用のメール（任意：フォーム初期値にも流用） */
  email?: string;
  /** 例: 'sanada'（任意） */
  samuraiTypeKey?: string;
  /** 例: '真田幸村型'（任意） */
  samuraiTypeJa?: string;
  /** レーダー用の確定カテゴリ（0〜3の数値に正規化） */
  categories: Array<Pick<CatItem, 'key' | 'score'>>;
};

/**
 * 結果画面でマウント時に一度だけ：
 *  - rid / email / scores を localStorage に保存
 *  - /api/results/finalize を叩いてスナップショット確定（多重実行ガード）
 *  - ページ離脱時の送信漏れを sendBeacon で補完
 */
export default function FinalizeOnMount({
  rid,
  email,
  samuraiTypeKey,
  samuraiTypeJa,
  categories,
}: Props) {
  const started = useRef(false);
  const finished = useRef(false);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    // 1) クライアント保持（フォーム/相談ページの自動復元に使用）
    try {
      localStorage.setItem('samurai:lastRid', rid);
      if (email) localStorage.setItem('samurai:lastEmail', String(email));
      const simple = categories.map((c) => ({ key: c.key, score: clamp03(c.score) }));
      localStorage.setItem('samurai:lastScores', JSON.stringify(simple));
    } catch {
      /* 何もしない（Safariプライベート等でも落とさない） */
    }

    // 2) サーバ確定ペイロード（共有）
    const payload = {
      rid,
      email: email ?? undefined,
      samuraiTypeKey,
      samuraiTypeJa,
      categories: categories.map((c) => ({ key: c.key, score: clamp03(c.score) })),
    };
    const bodyStr = JSON.stringify(payload);

    // 3) 送信本体（fetch keepalive）
    const controller = new AbortController();
    const send = async () => {
      if (finished.current) return;
      try {
        await fetch('/api/results/finalize', {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: bodyStr,
          keepalive: true, // 離脱中でも可能な限り送る
          signal: controller.signal,
        });
        finished.current = true;
      } catch (e) {
        // fetch 失敗は onpagehide での sendBeacon に託す
        // コンソールだけ出して UI は止めない
        console.warn('[finalize] fetch failed, will try beacon on pagehide.', e);
      }
    };
    void send();

    // 4) ページ離脱時の最終送信（まだ完了していなければ beacon）
    const onPageHide = () => {
      if (finished.current) return;
      try {
        const blob = new Blob([bodyStr], { type: 'application/json' });
        // 送信できなくても戻り値 false になるだけ。UIは止めない。
        navigator.sendBeacon?.('/api/results/finalize', blob);
        finished.current = true;
      } catch {
        /* noop */
      }
    };
    window.addEventListener('pagehide', onPageHide);
    window.addEventListener('beforeunload', onPageHide);

    return () => {
      controller.abort();
      window.removeEventListener('pagehide', onPageHide);
      window.removeEventListener('beforeunload', onPageHide);
    };
  }, [rid, email, samuraiTypeKey, samuraiTypeJa, categories]);

  return null;
}

function clamp03(n: unknown): number {
  const v = typeof n === 'number' ? n : Number(n);
  if (!Number.isFinite(v)) return 0;
  return Math.max(0, Math.min(3, v));
}
