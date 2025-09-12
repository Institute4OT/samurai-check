'use client';

import React, { useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';

type Option = string | { text: string; score?: number; id?: string };

type Props = {
  questionNumber: number;      // 表示順の番号（1～）
  totalQuestions: number;
  progressPercentage: number;
  noteText: string;
  questionText: string;        // 先頭に旧「Qxx.」が入っていてもOK（後で剥がす）
  options: Option[];
  selectedAnswers: string[];
  isMultipleChoice: boolean;
  onAnswerChange: (value: string) => void;
  onNext: () => void;
  onPrev: () => void;
  canGoBack: boolean;
};

const MAX_MULTI = 3;

// 旧「Q12.」「Q12．」などを剥がす（全角ドット対応）
function stripLeadingQNumber(s: string) {
  return String(s ?? '').replace(/^Q\s*\d+\s*[\.．]?\s*/i, '').trim();
}

function getLabel(opt: Option) {
  return typeof opt === 'string' ? opt : (opt.text ?? '');
}

export default function QuizQuestion(props: Props) {
  const {
    questionNumber, totalQuestions, progressPercentage, noteText,
    questionText, options, selectedAnswers, isMultipleChoice,
    onAnswerChange, onNext, onPrev, canGoBack,
  } = props;

  const router = useRouter();
  const wrapRef = useRef<HTMLHeadingElement>(null);

  const answered = selectedAnswers.length > 0;
  const isLast = questionNumber >= totalQuestions;

  const displayTitle = `Q${questionNumber}. ${stripLeadingQNumber(questionText)}`;

  const helper = useMemo(() => {
    if (answered) return '';
    return isMultipleChoice
      ? `少なくとも1つ選んでください（最大${MAX_MULTI}つまで）`
      : 'どれか1つ選んでください';
  }, [answered, isMultipleChoice]);

  function handleNext() {
    if (!answered) {
      wrapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    // ★最後の設問は必ず結果へ（親の改修なしで解決）
    if (isLast) {
      router.push('/result'); // ← 実際の結果ページパスに合わせて変更
      return;
    }
    onNext();
  }

  return (
    <div className="min-h-screen bg-white text-black px-4 py-10">
      <div className="mx-auto max-w-3xl">
        {/* 進捗（表示順ベース） */}
        <div className="mb-4 text-sm text-gray-600 flex items-center justify-between">
          <span>Q{questionNumber} / {totalQuestions}</span>
          <div className="w-40 h-2 bg-gray-200 rounded">
            <div className="h-2 bg-black rounded" style={{ width: `${progressPercentage}%` }} />
          </div>
        </div>

        {/* 説明ノート */}
        {noteText && <p className="text-xs text-gray-500 mb-2">{noteText}</p>}

        {/* 質問文（番号はここで付け直す） */}
        <h2 ref={wrapRef} className="text-xl font-bold mb-4 leading-relaxed">
          {displayTitle}
        </h2>

        {/* 選択肢 */}
        <div className="space-y-2 mb-6">
          {options.map((opt, i) => {
            const label = getLabel(opt);
            const id = `q-${questionNumber}-opt-${i}`;
            const checked = selectedAnswers.includes(label);

            const onChange = () => {
              // 複数選択は最大数を超えないようにクライアント側でもガード
              if (isMultipleChoice) {
                const willSelect = !checked;
                if (willSelect && selectedAnswers.length >= MAX_MULTI) {
                  wrapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
                  return; // これ以上は追加しない
                }
              }
              onAnswerChange(label);
            };

            return (
              <label
                key={id}
                htmlFor={id}
                className={`flex items-center gap-3 rounded-lg border px-4 py-3 cursor-pointer
                  ${checked ? 'border-black bg-gray-50' : 'border-gray-200 hover:bg-gray-50'}`}
              >
                <input
                  id={id}
                  type={isMultipleChoice ? 'checkbox' : 'radio'}
                  name={`q-${questionNumber}`}
                  className="h-4 w-4"
                  checked={checked}
                  onChange={onChange}
                />
                <span className="text-sm">{label}</span>
              </label>
            );
          })}
        </div>

        {/* 補助メッセージ */}
        {!answered && <p className="text-sm text-amber-700 mb-3">{helper}</p>}
        {isMultipleChoice && selectedAnswers.length >= MAX_MULTI && (
          <p className="text-xs text-amber-700 mb-3">※ 選択は最大{MAX_MULTI}つまでです</p>
        )}

        {/* 操作 */}
        <div className="flex items-center justify-between gap-3">
          <Button
            type="button"
            variant="outline"
            onClick={onPrev}
            disabled={!canGoBack}
            className="rounded-xl"
          >
            戻る
          </Button>
          <Button
            type="button"
            onClick={handleNext}
            disabled={!answered}
            className="rounded-xl disabled:opacity-50"
            aria-disabled={!answered}
          >
            {isLast ? '結果を見る' : '次へ'}
          </Button>
        </div>
      </div>
    </div>
  );
}
