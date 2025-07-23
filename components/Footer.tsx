'use client';

import React from 'react';

export default function Footer() {
  return (
    <footer className="py-6">
      <a
        href="https://ourdx-mtg.com/"
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center justify-center text-gray-500 text-sm space-x-2 hover:text-gray-700 transition-colors duration-200"
      >
        <img
          src="/images/logo.png"
          alt="企業の未来づくり研究所ロゴ"
          className="w-[40px] h-auto opacity-70 hover:opacity-90 transition-opacity duration-200"
        />
        <span>© 一般社団法人 企業の未来づくり研究所</span>
      </a>
    </footer>
  );
}