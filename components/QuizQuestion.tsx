'use client';

import React from 'react';
import Footer from './Footer';
import { ArrowLeft, ArrowRight } from 'lucide-react';

interface Option {
  text: string;
  score: number;
}

interface QuizQuestionProps {
  questionNumber: number;
  totalQuestions: number;
  progressPercentage: number;
  questionText: string;
  options: Option[];
  selectedAnswers: string[];
  isMultipleChoice: boolean;
  onAnswerChange: (value: string) => void;
  onNext: () => void;
  onPrev: () => void;
  canGoBack: boolean;
}

export default function QuizQuestion({
  questionNumber,
  totalQuestions,
  progressPercentage,
  questionText,
  options,
  selectedAnswers,
  isMultipleChoice,
  onAnswerChange,
  onNext,
  onPrev,
  canGoBack,
}: QuizQuestionProps) {
  return (
    <div className="min-h-screen bg-white text-black flex flex-col">
      {/* メインコンテンツ */}
      <div className="flex-1 flex flex-col items-center justify-center px-4 py-8">
        <div className="max-w-3xl w-full space-y-8">
          {/* 進捗表示 */}
          <div className="text-center">
            <p className="text-lg text-gray-600 mb-2">Q{questionNumber} / {totalQuestions}</p>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div className="bg-red-600 h-2 rounded-full" style={{ width: `${progressPercentage}%` }}></div>
            </div>
          </div>

          {/* 設問 */}
          <div className="bg-white border border-gray-200 rounded-lg p-6 md:p-8 shadow-sm">
            <h2 className="text-xl md:text-2xl font-bold text-black mb-6">
              {questionText}
            </h2>

            {/* 選択肢 */}
            <div className="space-y-5">
              {options.map((option, index) => (
                <label
                  key={index}
                  className="flex items-start space-x-3 p-4 rounded-lg border border-gray-200 hover:bg-gray-50 cursor-pointer transition-colors"
                >
                  <input
                    type={isMultipleChoice ? "checkbox" : "radio"}
                    name={isMultipleChoice ? undefined : `q${questionNumber}`}
                    value={option.text}
                    checked={selectedAnswers.includes(option.text)}
                    onChange={() => onAnswerChange(option.text)}
                    className="mt-1 w-4 h-4 text-red-600 border-gray-300 focus:ring-red-500 rounded"
                  />
                  <span className="text-base md:text-lg text-gray-800 leading-relaxed">
                    {option.text}
                  </span>
                </label>
              ))}
            </div>

            {/* ナビゲーションボタン */}
            <div className="mt-8 flex justify-between items-center">
              {/* 前の質問に戻るボタン */}
              {canGoBack ? (
                <button
                  onClick={onPrev}
                  className="flex items-center space-x-2 px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors duration-200"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>前の質問に戻る</span>
                </button>
              ) : (
                <div></div> // 空のdivでスペースを確保
              )}

              {/* 次へボタン */}
              {selectedAnswers.length > 0 && (
                <button
                  onClick={onNext}
                  className="flex items-center space-x-2 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-6 rounded-lg text-lg transition-colors duration-200 shadow-lg hover:shadow-xl"
                >
                  <span>次へ</span>
                  <ArrowRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* フッター */}
      <Footer />
    </div>
  );
}