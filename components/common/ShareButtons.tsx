// components/common/ShareButtons.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';

type Props = {
  /** 例: "豊臣秀吉型"（任意。未指定なら text または汎用文言を使用） */
  typeName?: string;
  /** シェアしたいURL（未指定時は window.location.origin にフォールバック） */
  url?: string;
  /** 直接シェア文言を渡したい場合（任意） */
  text?: string;
  className?: string;
};

export default function ShareButtons({ typeName, url, text, className }: Props) {
  const [origin, setOrigin] = useState<string>('');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      // 明示URLが無ければ origin を確保（トップ誘導）
      setOrigin(window.location.origin);
    }
  }, []);

  // URLを必ずstringに整形（未指定ならトップへ）
  const shareUrl = useMemo(() => {
    const base = (url ?? origin ?? '').trim();
    if (!base) return '';
    return base.endsWith('/') ? base : `${base}/`;
  }, [url, origin]);

  // シェア文言（優先度：props.text > typeNameベース > 汎用）
  const shareText = useMemo(() => {
    if (text && text.trim() !== '') return text;
    if (typeName && typeName.trim() !== '') {
      return `私は「${typeName}」でした！AI時代の経営者 武将タイプ診断やってみた😆`;
    }
    return `AI時代の経営者 武将タイプ診断やってみた😆`;
  }, [text, typeName]);

  const encoded = useMemo(
    () => ({
      url: encodeURIComponent(shareUrl),
      text: encodeURIComponent(shareText),
      both: encodeURIComponent(`${shareText} ${shareUrl}`.trim()),
    }),
    [shareUrl, shareText]
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
    const top =
      typeof window !== 'undefined'
        ? window.top!.outerHeight / 2 + window.top!.screenY - h / 2
        : 0;
    const left =
      typeof window !== 'undefined'
        ? window.top!.outerWidth / 2 + window.top!.screenX - w / 2
        : 0;
    window.open(
      href,
      '_blank',
      `popup=yes,noopener,noreferrer,width=${w},height=${h},top=${top},left=${left}`
    );
  }

  async function copyAll() {
    try {
      await navigator.clipboard.writeText(`${shareText} ${shareUrl}`.trim());
      alert('リンクと文章をコピーしました');
    } catch {
      alert('コピーに失敗しました。手動でコピーしてください。');
    }
  }

  async function webShare() {
    if (navigator.share) {
      try {
        await navigator.share({ title: '武将タイプ診断', text: shareText, url: shareUrl });
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
