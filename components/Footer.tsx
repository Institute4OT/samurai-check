// components/Footer.tsx
'use client';
import React from 'react';
import ExternalLink from './ui/ExternalLink';
import { ExternalLink as ExternalLinkIcon } from 'lucide-react';
import Image from 'next/image';

export default function Footer() {
  return (
    <footer className="py-6 sm:py-8">
      <div className="flex flex-col items-center gap-2 text-center">
        {/* ロゴ＋社名（1行目） */}
        <ExternalLink
          href="https://ourdx-mtg.com"
          className="inline-flex items-center gap-2 text-neutral-500 dark:text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 transition-colors"
          title="一般社団法人 企業の未来づくり研究所（新しいタブで開きます）"
        >
          <Image
            src="/images/logo.png"
            alt="企業の未来づくり研究所ロゴ"
            width={48}
            height={48}
            className="h-auto w-12 opacity-80 hover:opacity-100 transition-opacity shrink-0"
            priority
          />
          <span className="whitespace-nowrap font-medium">
            一般社団法人 企業の未来づくり研究所
          </span>
          <ExternalLinkIcon size={14} className="opacity-70 shrink-0" aria-hidden="true" />
        </ExternalLink>

        {/* プライバシーポリシー＋特商法（2行目） */}
        <div className="flex flex-row items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400">
          <ExternalLink href="https://ourdx-mtg.com/privacy-policy/">
            プライバシーポリシー
          </ExternalLink>
          <span aria-hidden>｜</span>
          <ExternalLink href="https://ourdx-mtg.com/tokusho/">
            特定商取引法に基づく表記
          </ExternalLink>
        </div>
      </div>
    </footer>
  );
}
