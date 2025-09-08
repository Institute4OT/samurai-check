// components/QuizQuestion.tsx
'use client';

import React, { useMemo, useRef } from 'react';
import { Button } from '@/components/ui/button';

type Option = string | { text: string; score?: number; id?: string };

type Props = {
  questionNumber: number;
  totalQuestions: number;
  progressPercentage: number;
  noteText: string;
  questionText: string;
  options: Option[];                    // ← ここをユニオン型に
  selectedAnswers: string[];
  isMultipleChoice: boolean;
  onAnswerChange: (value: string) => void;
  onNext: () => void;
  onPrev: () => void;
  canGoBack: boolean;
};

function getLabel(opt: Option) {
  return typeof opt === 'string' ? opt : (opt.text ?? '');
}

function getKeyBase(qNo: number, opt: Option) {
  if (typeof opt === 'string') return `q${qNo}-${opt}`;
  return `q${qNo}-${opt.id ?? opt.text}`;
}

export default function QuizQuestion(props: Props) {
  const {
    questionNumber, totalQuestions, progressPercentage, noteText,
    questionText, options, selectedAnswers, isMultipleChoice,
    onAnswerChange, onNext, onPrev, canGoBack,
  } = props;

  const answered = selectedAnswers.length > 0;
  const helper = useMemo(() => {
    if (answered) return '';
    return isMultipleChoice
      ? '少なくとも1つ選んでください（最大3つまで）'
      : 'どれか1つ選んでください';
  }, [answered, isMultipleChoice]);

  const wrapRef = useRef<HTMLDivElement>(null);

  function handleNext() {
    if (!answered) {
      wrapRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
      return;
    }
    onNext();
  }

  return (
    <div className="min-h-screen bg-white text-black px-4 py-10">
      <div className="mx-auto max-w-3xl">
        {/* 進捗 */}
        <div className="mb-4 text-sm text-gray-600 flex items-center justify-between">
          <span>Q{questionNumber} / {totalQuestions}</span>
          <div className="w-40 h-2 bg-gray-200 rounded">
            <div className="h-2 bg-black rounded" style={{ width: `${progressPercentage}%` }} />
          </div>
        </div>

        {/* 説明ノート */}
        {noteText && <p className="text-xs text-gray-500 mb-2">{noteText}</p>}

        {/* 質問文 */}
        <h2 ref={wrapRef} className="text-xl font-bold mb-4 leading-relaxed">
          {questionText}
        </h2>

        {/* 選択肢 */}
        <div className="space-y-2 mb-6">
          {options.map((opt) => {
            const label = getLabel(opt);
            const key = getKeyBase(questionNumber, opt);
            const checked = selectedAnswers.includes(label);

            return (
              <label key={key}
                className={`flex items-center gap-3 rounded-lg border px-4 py-3 cursor-pointer
                  ${checked ? 'border-black bg-gray-50' : 'border-gray-200 hover:bg-gray-50'}`}>
                <input
                  type={isMultipleChoice ? 'checkbox' : 'radio'}
                  name={`q-${questionNumber}`}
                  className="h-4 w-4"
                  checked={checked}
                  onChange={() => onAnswerChange(label)}
                />
                <span className="text-sm">{label}</span>
              </label>
            );
          })}
        </div>

        {/* 補助メッセージ */}
        {!answered && <p className="text-sm text-amber-700 mb-3">{helper}</p>}

        {/* 操作 */}
        <div className="flex items-center justify-between gap-3">
          <Button type="button" variant="outline" onClick={onPrev} disabled={!canGoBack} className="rounded-xl">
            戻る
          </Button>
          <Button type="button" onClick={handleNext} disabled={!answered} className="rounded-xl disabled:opacity-50" aria-disabled={!answered}>
            次へ
          </Button>
        </div>
      </div>
    </div>
  );
}
