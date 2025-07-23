'use client';

import React from 'react';
import Footer from './Footer';

interface StartScreenProps {
  startQuiz: () => void;
}

export default function StartScreen({ startQuiz }: StartScreenProps) {
  return (
    <div className="min-h-screen bg-white text-black flex flex-col">
      {/* メインコンテンツ */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="max-w-4xl w-full text-center space-y-8">
          {/* シリーズ表示 */}
          <p className="text-sm md:text-base text-gray-600 font-medium">
            ～「秒速経営」シリーズ～
          </p>

          {/* タイトル */}
          <h1 className="text-3xl md:text-5xl font-bold text-black mb-8 leading-tight">
            AI時代の経営者<br />
            🏯武将タイプ診断🏯
          </h1>

          {/* サブキャッチコピー */}
          <div className="text-lg md:text-xl text-gray-700 font-medium mb-8 space-y-2">
            <p>AI時代の"経営戦国"を生き抜けるのは誰だ？</p>
            <p>あなたのタイプを今すぐチェック！</p>
          </div>

          {/* バナー風テキストブロック */}

          {/* 診断開始ボタンと所要時間 */}
          <div className="pt-4 space-y-3">
            <button
              onClick={startQuiz}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-8 md:py-5 md:px-12 rounded-lg text-lg md:text-xl transition-colors duration-200 shadow-lg hover:shadow-xl"
            >
              ▶ 診断を始める
            </button>
            
            <p className="text-sm md:text-base text-gray-500">
              全14問、所要時間3～5分
            </p>
          </div>
        </div>
      </div>

      {/* フッター */}
      <Footer />
    </div>
  );
}