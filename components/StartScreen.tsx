// components/StartScreen.tsx
'use client';

import React from 'react';
import Footer from './Footer';

interface StartScreenProps {
  startQuiz: () => void;
}

export default function StartScreen({ startQuiz }: StartScreenProps) {
  return (
    <div className="min-h-screen bg-white text-black flex flex-col">
      {/* メイン */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="w-full max-w-4xl text-center space-y-8">
          {/* シリーズ表示 */}
          <p className="text-sm md:text-base text-gray-600 font-medium">
            ～「秒速経営」シリーズ～
          </p>

          {/* タイトル */}
          <h1 className="text-3xl md:text-5xl font-bold text-black leading-tight">
            AI時代の経営者<br />
            🏯武将タイプ診断🏯
          </h1>

          {/* サブコピー（短く・期待を喚起） */}
          <div className="text-lg md:text-xl text-gray-700 font-medium space-y-2">
            <p>“いまの進み方”で、会社はどれだけ加速できる？</p>
            <p>タイプ＋6カテゴリのバランスをその場で確認。</p>
          </div>

          {/* 価値提案（箇条書きでサッと読める） */}
          <div className="mx-auto max-w-2xl text-left text-gray-700 text-sm md:text-base space-y-1 leading-relaxed">
            <p className="font-semibold text-gray-800">この診断でわかること</p>
            <ul className="list-disc pl-5 space-y-1">
              <li>権限委譲・構造健全度／組織進化のブレーキ</li>
              <li>コミュ力誤差・ジェネギャップ感覚（伝わり方のズレ）</li>
              <li>アップデート力／無自覚ハラスメント傾向</li>
            </ul>
            <p className="text-gray-600">
              結果はその場で表示。ご希望の方には<strong>無料の詳細レポート</strong>もお届けします。
            </p>
          </div>

          {/* CTA */}
          <div className="pt-2 space-y-3">
            <button
              onClick={startQuiz}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-4 px-8 md:py-5 md:px-12 rounded-lg text-lg md:text-xl transition-colors duration-200 shadow-lg hover:shadow-xl"
            >
              ▶ 診断を始める
            </button>

            {/* 補足（短く） */}
            <div className="text-sm md:text-base text-gray-500 space-y-1">
              <p>全16問／所要時間 3〜5分（従業員のいる経営者・役員向け）</p>
              <p>※ 回答内容はレポート生成と統計的な傾向分析のみに利用します。</p>
            </div>
          </div>
        </div>
      </div>

      {/* フッター（規約・プライバシーはフッターに任せる） */}
      <Footer />
    </div>
  );
}
