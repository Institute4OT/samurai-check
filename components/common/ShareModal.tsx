// components/common/ShareModal.tsx
"use client";

import { useMemo, useState } from "react";
import {
  X as XIcon,
  Facebook,
  Linkedin,
  Link as LinkIcon,
  Copy,
  ExternalLink,
  LineChart,
} from "lucide-react";
import { Button } from "@/components/ui/button";

type Props = {
  open: boolean;
  onClose: () => void;
  /** 共有テキスト（例：私は「豊臣秀吉型」だったよ！） */
  text: string;
  /** 共有URL（未指定時は location.origin を使用） */
  url?: string;
  /** サブ見出し（任意） */
  subtitle?: string;
};

/** 中央にポップアップを開く（型安全 & クロスブラウザ） */
function openCenteredPopup(href: string) {
  const w = 600;
  const h = 520;

  // SSR/非ブラウザ環境のガード
  if (typeof window === "undefined") {
    return;
  }

  // 非標準の screenLeft/screenTop を考慮しつつ、安全に取得
  const win = window as Window &
    typeof globalThis & { screenLeft?: number; screenTop?: number };

  const dualLeft = win.screenLeft ?? window.screenX ?? 0;
  const dualTop = win.screenTop ?? window.screenY ?? 0;

  const width =
    window.innerWidth ?? document.documentElement.clientWidth ?? screen.width;
  const height =
    window.innerHeight ??
    document.documentElement.clientHeight ??
    screen.height;

  const left = dualLeft + (width - w) / 2;
  const top = dualTop + (height - h) / 2;

  window.open(
    href,
    "_blank",
    `noopener,noreferrer,toolbar=no,location=no,status=no,menubar=no,scrollbars=yes,resizable=yes,width=${w},height=${h},left=${left},top=${top}`,
  );
}

export default function ShareModal({
  open,
  onClose,
  text,
  url,
  subtitle,
}: Props) {
  const href = useMemo(() => {
    if (url) return url;
    if (typeof window !== "undefined") return window.location.origin + "/";
    return "";
  }, [url]);

  const encoded = useMemo(
    () => ({
      url: encodeURIComponent(href),
      text: encodeURIComponent(text),
    }),
    [href, text],
  );

  const [copied, setCopied] = useState(false);

  if (!open) return null;

  const shareItems = [
    {
      name: "X (Twitter)",
      color: "bg-black hover:bg-zinc-900",
      icon: <XIcon className="w-5 h-5 text-white mr-3" />,
      onClick: () => {
        const u = `https://x.com/intent/post?text=${encoded.text}&url=${encoded.url}`;
        openCenteredPopup(u);
      },
    },
    {
      name: "LINE でシェア",
      color: "bg-green-500 hover:bg-green-600",
      icon: <LineChart className="w-5 h-5 text-white mr-3" />,
      onClick: () => {
        const u = `https://line.me/R/msg/text/?${encoded.text}%0A${encoded.url}`;
        openCenteredPopup(u);
      },
    },
    {
      name: "Facebook でシェア",
      color: "bg-blue-600 hover:bg-blue-700",
      icon: <Facebook className="w-5 h-5 text-white mr-3" />,
      onClick: () => {
        const u = `https://www.facebook.com/sharer/sharer.php?u=${encoded.url}&quote=${encoded.text}`;
        openCenteredPopup(u);
      },
    },
    {
      name: "LinkedIn でシェア",
      color: "bg-sky-700 hover:bg-sky-800",
      icon: <Linkedin className="w-5 h-5 text-white mr-3" />,
      onClick: () => {
        const u = `https://www.linkedin.com/sharing/share-offsite/?url=${encoded.url}`;
        openCenteredPopup(u);
      },
    },
  ];

  async function copyAll() {
    try {
      await navigator.clipboard.writeText(`${text}\n${href}`);
      setCopied(true);
      setTimeout(() => setCopied(false), 1600);
    } catch {
      // noop
    }
  }

  async function nativeShare() {
    try {
      if (navigator.share) {
        await navigator.share({ title: "武将タイプ診断", text, url: href });
      } else {
        await copyAll();
        alert(
          "お使いの端末では共有ダイアログが使えないため、テキストをコピーしました。",
        );
      }
    } catch {
      /* cancel */
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      {/* backdrop */}
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      {/* modal */}
      <div className="relative w-full max-w-md mx-4 rounded-2xl bg-white shadow-xl border">
        <div className="p-5 border-b flex items-center justify-between">
          <div>
            <h3 className="text-lg font-bold">あなたの武将型をシェア</h3>
            {subtitle && (
              <p className="text-xs text-muted-foreground mt-1">{subtitle}</p>
            )}
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-md hover:bg-slate-100"
          >
            <XIcon className="w-5 h-5" />
          </button>
        </div>

        <div className="p-5 space-y-3">
          {shareItems.map((it) => (
            <button
              key={it.name}
              onClick={it.onClick}
              className={`w-full flex items-center justify-between rounded-xl px-4 py-3 text-white transition-colors ${it.color}`}
            >
              <span className="flex items-center">
                {it.icon}
                <span className="font-medium">{it.name}</span>
              </span>
              <ExternalLink className="w-4 h-4 opacity-90" />
            </button>
          ))}

          {/* 端末の共有 or コピー */}
          <div className="grid grid-cols-2 gap-3 pt-1">
            <Button
              variant="secondary"
              className="w-full"
              onClick={nativeShare}
            >
              <LinkIcon className="w-4 h-4 mr-2" />
              端末で共有
            </Button>
            <Button variant="outline" className="w-full" onClick={copyAll}>
              <Copy className="w-4 h-4 mr-2" />
              {copied ? "コピーしました！" : "リンクをコピー"}
            </Button>
          </div>

          <p className="text-[11px] text-muted-foreground pt-1">
            ※
            一部のSNSでは本文の自動入力が制限され、URLのみが挿入される場合があります。
          </p>
        </div>
      </div>
    </div>
  );
}
