// components/Footer.tsx
'use client';
import React from 'react';
import ExternalLink from './ui/ExternalLink';
import { ExternalLink as ExternalLinkIcon } from 'lucide-react';
import Image from 'next/image';

export default function Footer() {
  return (
    <footer className="py-6 sm:py-8">
      {/* IOTロゴ＋社名（新しいタブ） */}
      <ExternalLink
        href="https://ourdx-mtg.com"
        className="inline-flex items-center justify-center
                   text-neutral-500 dark:text-neutral-400
                   text-xs sm:text-sm gap-1.5 sm:gap-2
                   hover:text-neutral-700 dark:hover:text-neutral-200
                   transition-colors duration-200 motion-reduce:transition-none
                   p-2 -m-2 rounded-xl focus-visible:outline-none
                   focus-visible:ring-2 focus-visible:ring-indigo-500
                   focus-visible:ring-offset-2 focus-visible:ring-offset-white
                   dark:focus-visible:ring-offset-neutral-900"
        title="一般社団法人 企業の未来づくり研究所（新しいタブで開きます）"
      >
        <Image
          src="/images/logo.png"
          alt="企業の未来づくり研究所ロゴ"
          width={40}
          height={40}
          className="h-auto w-[36px] sm:w-[40px]
                     opacity-70 hover:opacity-90
                     transition-opacity duration-200 motion-reduce:transition-none
                     shrink-0"
          priority
        />
        <span className="whitespace-nowrap">
          一般社団法人 企業の未来づくり研究所
        </span>
        <ExternalLinkIcon size={12} className="sm:size-4 opacity-70 shrink-0" aria-hidden="true" />
        <span className="sr-only">（リンクは新しいタブで開きます）</span>
      </ExternalLink>

      {/* プライバシーポリシー／特商法リンク */}
      <div className="mt-3 flex items-center justify-center gap-3 text-xs
                      text-neutral-500 dark:text-neutral-400">
        <ExternalLink href="https://ourdx-mtg.com/privacy-policy/">
          プライバシーポリシー
        </ExternalLink>
        <span aria-hidden>｜</span>
        <ExternalLink href="https://ourdx-mtg.com/tokusho/">
          特定商取引法に基づく表記
        </ExternalLink>
      </div>
    </footer>
  );
}
