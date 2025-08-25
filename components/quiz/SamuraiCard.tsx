// components/quiz/SamuraiCard.tsx
'use client';

import { useMemo, useState } from 'react';
import ShareButtons from '@/components/common/ShareButtons';
import { Check, Copy } from 'lucide-react';

type Props = {
  type: string;           // 例: "真田幸村型"
  description: string;    // タイプの説明文
  userId?: string | null; // 診断ID（任意）
};

export default function SamuraiCard({ type, description, userId }: Props) {
  const [copied, setCopied] = useState(false);

  async function copyId() {
    if (!userId) return;
    try {
      await navigator.clipboard.writeText(userId);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      /* noop */
    }
  }

  // ShareButtons に渡す値をメモ化（url は必ず string に確定）
  const share = useMemo(() => {
    const origin =
      typeof window !== 'undefined' ? window.location.origin : '';
    const url = `${origin}/`; // 末尾スラッシュ付きで統一
    const text = `#武将タイプ診断　私は「${type}」タイプでした！当たってる？👇`;
    return { url, text };
  }, [type]);

  return (
    <div className="mb-8 p-6 bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200 rounded-lg">
      <h1 className="text-4xl md:text-5xl font-bold text-red-700 mb-4">{type}</h1>
      <p className="text-lg md:text-xl text-gray-700 leading-relaxed">{description}</p>

      {userId && (
        <div className="flex items-center justify-center mt-4 space-x-2">
          <p className="text-sm text-gray-500">診断ID: {userId}</p>
          <button
            onClick={copyId}
            className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
            title="診断IDをコピー"
          >
            {copied ? (
              <Check className="w-4 h-4 text-green-500" />
            ) : (
              <Copy className="w-4 h-4" />
            )}
          </button>
        </div>
      )}

      <div className="mt-4 border-t border-red-200/40 pt-3">
        <p className="text-xs text-gray-500 mb-1">あなたの武将型をシェアしよう</p>
        <ShareButtons
          url={share.url}            // string 確定
          text={share.text}
          className="justify-center gap-2"
        />
      </div>
    </div>
  );
}
