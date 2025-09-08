// components/result/IdBadge.tsx
'use client';

import { useState } from 'react';
import { Copy, Check } from 'lucide-react';

/** 結果ID（rid）を小さく表示してコピボも付ける */
export default function IdBadge({ rid }: { rid?: string | null }) {
  const v = String(rid ?? '').trim();
  const [copied, setCopied] = useState(false);
  if (!v) return null;

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(v);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {}
  }

  return (
    <div className="text-xs text-muted-foreground flex items-center gap-2">
      <span>結果ID（rid）：<code className="px-1 bg-gray-100 rounded">{v}</code></span>
      <button
        type="button"
        onClick={handleCopy}
        className="inline-flex items-center gap-1 rounded-md border px-2 py-0.5 hover:bg-accent"
        aria-label="結果IDをコピー"
        title="コピー"
      >
        {copied ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
        {copied ? 'copied' : 'copy'}
      </button>
    </div>
  );
}
