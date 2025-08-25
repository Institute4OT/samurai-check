'use client';

import { useEffect, useMemo, useState } from 'react';

type Props = {
  /** 例: "豊臣秀吉型" */
  typeName: string;
  /** シェアしたいURL（省略時は window.location.origin を使用し、トップに誘導） */
  url?: string;
  className?: string;
};

export default function ShareButtons({ typeName, url, className }: Props) {
  const [origin, setOrigin] = useState<string>('');

  useEffect(() => {
    if (!url && typeof window !== 'undefined') {
      setOrigin(window.location.origin);
    }
  }, [url]);

  // シェア先URL（トップへ誘導。必要なら /?from=share 等を付けてください）
  const shareUrl = useMemo(() => {
    const base = url || origin || '';
    if (!base) return '';
    // 末尾スラッシュ整形
    return base.endsWith('/') ? base : `${base}/`;
  }, [url, origin]);

  const text = useMemo(
    () => `私は「${typeName}」でした！AI時代の経営者 武将タイプ診断やってみた😆`,
    [typeName]
  );

  const encoded = useMemo(
    () => ({
      url: encodeURIComponent(shareUrl),
      text: encodeURIComponent(text),
      both: encodeURIComponent(`${text} ${shareUrl}`),
    }),
    [shareUrl, text]
  );

  // 各サービスの公式エンドポイント（2025-08時点）
  // ※ FB/LinkedIn は本文プリセット不可。URLのみ。
  const items = [
    {
      key: 'x',
      label: 'X でシェア',
      href: `https://x.com/intent/post?text=${encoded.text}&url=${encoded.url}`,
    },
    {
      key: 'line',
      label: 'LINE でシェア',
      // 推奨：text= に「本文＋URL」をまとめて渡す
      href: `https://line.me/R/share?text=${encoded.both}`,
    },
    {
      key: 'facebook',
      label: 'Facebook でシェア',
      href: `https://www.facebook.com/sharer/sharer.php?u=${encoded.url}`,
    },
    {
      key: 'linkedin',
      label: 'LinkedIn でシェア',
      href: `https://www.linkedin.com/sharing/share-offsite/?url=${encoded.url}`,
    },
  ] as const;

  function openPopup(href: string) {
    const w = 680;
    const h = 520;
    const y = typeof window !== 'undefined' ? window.top!.outerHeight / 2 + window.top!.screenY - h / 2 : 0;
    const x = typeof window !== 'undefined' ? window.top!.outerWidth / 2 + window.top!.screenX - w / 2 : 0;
    window.open(
      href,
      '_blank',
      `popup=yes,noopener,noreferrer,width=${w},height=${h},top=${y},left=${x}`
    );
  }

  async function copyAll() {
    try {
      await navigator.clipboard.writeText(`${text} ${shareUrl}`);
      alert('リンクと文章をコピーしました');
    } catch {
      alert('コピーに失敗しました。手動でコピーしてください。');
    }
  }

  async function webShare() {
    // 端末のネイティブ共有（使える環境のみ）
    if (navigator.share) {
      try {
        await navigator.share({ title: '武将タイプ診断', text, url: shareUrl });
      } catch {
        /* キャンセル等は無視 */
      }
    } else {
      copyAll();
    }
  }

  return (
    <div className={`flex flex-wrap gap-2 justify-center ${className || ''}`}>
      {items.map((it) => (
        <button
          key={it.key}
          type="button"
          onClick={() => openPopup(it.href)}
          className="px-2.5 py-1.5 text-xs rounded-md border hover:bg-gray-50"
          aria-label={it.label}
        >
          {it.label}
        </button>
      ))}

      <button
        type="button"
        onClick={copyAll}
        className="px-2.5 py-1.5 text-xs rounded-md border hover:bg-gray-50"
        aria-label="リンクをコピー"
      >
        リンクをコピー
      </button>

      <button
        type="button"
        onClick={webShare}
        className="px-2.5 py-1.5 text-xs rounded-md border hover:bg-gray-50"
        aria-label="端末で共有"
      >
        端末で共有
      </button>
    </div>
  );
}
