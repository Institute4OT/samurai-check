'use client';

import React from 'react';
import Footer from './Footer';
import { ArrowLeft, ArrowRight } from 'lucide-react';

interface Option {
  text: string;
  score: number;
}

interface QuizQuestionProps {
  questionNumber: number;        // 表示ポジション（1-based）
  totalQuestions: number;
  progressPercentage: number;    // 0-100
  questionText: string;          // 元の設問文（先頭に "Q3." などが含まれていてもOK）
  options: Option[];
  selectedAnswers: string[];
  isMultipleChoice: boolean;
  onAnswerChange: (value: string) => void;
  onNext: () => void;
  onPrev: () => void;
  canGoBack: boolean;
  /** ブロック見出し（設問の1行上に薄色で表示） */
  noteText?: string;
}

function stripLeadingQ(prefixText: string): string {
  // 先頭の "Q12." / "Q12、" / "Q12)" / "Q12：" などを除去（全角記号にも耐性）
  return (prefixText || '').replace(
    /^\s*Q\s*[0-9０-９]+[.\．、\)\）:：]?\s*/,
    ''
  );
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
  noteText,
}: QuizQuestionProps) {
  const cleaned = stripLeadingQ(questionText);

  const isSelected = (v: string) => selectedAnswers.includes(v);
  const toggle = (v: string) => onAnswerChange(v);

  return (
    <div className="min-h-screen bg-white text-black flex flex-col">
      {/* ヘッダー（進捗） */}
      <div className="w-full max-w-4xl mx-auto px-4 pt-6">
        <div className="text-center text-gray-600 text-sm mb-2">
          Q{questionNumber} / {totalQuestions}
        </div>
        <div className="w-full bg-gray-200 h-2 rounded">
          <div
            className="bg-red-600 h-2 rounded"
            style={{ width: `${Math.min(Math.max(progressPercentage, 0), 100)}%` }}
          />
        </div>
      </div>

      {/* 本文 */}
      <div className="flex-1 flex flex-col items-center">
        <div className="w-full max-w-4xl px-4 py-6">
          {/* ブロック見出し（薄色・小さめ・設問の一行上） */}
          {noteText && (
            <div className="text-gray-500 text-sm md:text-base mb-1">
              {noteText}
            </div>
          )}

          {/* 設問タイトル（Q番号は自動付与） */}
          <h2 className="text-xl md:text-2xl font-semibold leading-relaxed mb-4">
            {`Q${questionNumber}. `}{cleaned}
          </h2>

          {/* 選択肢 */}
          <div className="space-y-3">
            {options.map((opt, idx) => {
              const id = `opt-${questionNumber}-${idx}`;
              return (
                <label
                  key={id}
                  htmlFor={id}
                  className="flex items-start gap-3 p-4 border rounded-lg hover:bg-gray-50 cursor-pointer"
                >
                  {isMultipleChoice ? (
                    <input
                      id={id}
                      type="checkbox"
                      className="mt-1 h-5 w-5"
                      checked={isSelected(opt.text)}
                      onChange={() => toggle(opt.text)}
                    />
                  ) : (
                    <input
                      id={id}
                      type="radio"
                      name={`q-${questionNumber}`}
                      className="mt-1 h-5 w-5"
                      checked={isSelected(opt.text)}
                      onChange={() => toggle(opt.text)}
                    />
                  )}
                  <span className="text-base md:text-lg">{opt.text}</span>
                </label>
              );
            })}
          </div>

          {/* ナビゲーション */}
          <div className="mt-6 flex items-center justify-between">
            <button
              onClick={onPrev}
              disabled={!canGoBack}
              className={`flex items-center gap-2 px-4 py-2 rounded-lg border transition ${
                canGoBack ? 'hover:bg-gray-50' : 'opacity-40 cursor-not-allowed'
              }`}
            >
              <ArrowLeft className="w-4 h-4" />
              前の質問に戻る
            </button>

            <button
              onClick={onNext}
              className="bg-red-600 hover:bg-red-700 text-white font-bold px-6 py-3 rounded-lg shadow-lg hover:shadow-xl flex items-center gap-2"
            >
              次へ
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      <Footer />
    </div>
  );
}
