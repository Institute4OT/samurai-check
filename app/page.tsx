// app/page.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import StartScreen from '@/components/StartScreen';
import QuizQuestion from '@/components/QuizQuestion';
import { quizQuestions, QuizQuestion as QuizQuestionType } from '@/lib/quizQuestions';
import { shuffleArray } from '@/lib/utils';

// 2引数: (pattern, answers)
import { debugScoreCalculation } from '@/lib/scoringSystem';

import type { NormalizedCategoryScores, SamuraiType } from '@/types/diagnosis';
import { judgeSamuraiType } from '@/lib/samuraiJudge';

import { supabase, SamuraiResult } from '@/lib/supabase';
import { generateScoreComments } from '@/lib/generateScoreComments';
import { DISPLAY_ORDER, blockTitleByFirstPosition } from '@/lib/quizBlocks';
import ResultPanel from '@/components/result/ResultPanel';

/* ================= ユーティリティ ================= */

const NONE_LABELS = new Set(['該当するものはない', '該当なし', '特になし']);
const NUMERIC_ORDER = DISPLAY_ORDER.map((code) => Number(String(code).replace(/^Q/i, '')));

/* ======================= 画面本体 ======================= */

export default function Home() {
  const router = useRouter();
  const sp = useSearchParams();

  // 旧リンク互換： /?rid=... で来たら /result?rid=... に寄せる
  useEffect(() => {
    const rid =
      sp.get('rid') || sp.get('resultId') || sp.get('resultid') || sp.get('id');
    if (rid) {
      router.replace(`/result?rid=${encodeURIComponent(rid)}`);
    }
  }, [sp, router]);

  const [currentStep, setCurrentStep] = useState<'start' | `q${number}` | 'result'>('start');
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
  const [shuffledQuestions, setShuffledQuestions] = useState<QuizQuestionType[]>([]);
  const [allAnswers, setAllAnswers] = useState<{ questionId: number; selectedAnswers: string[] }[]>([]);
  const [finalScores, setFinalScores] = useState<NormalizedCategoryScores | null>(null);
  const [samuraiType, setSamuraiType] = useState<SamuraiType | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [generatedComments, setGeneratedComments] = useState<{ strengths: string[]; tips: string[] }>({ strengths: [], tips: [] });

  // 表示順に並び替え（選択肢だけランダム）
  const orderedQuestions = useMemo<QuizQuestionType[]>(() => {
    const byId = new Map(quizQuestions.map((q) => [q.id, q]));
    return NUMERIC_ORDER
      .map((id) => byId.get(id))
      .filter((q): q is QuizQuestionType => Boolean(q))
      .map((q) => ({ ...q, options: shuffleArray(q.options) }));
  }, []);
  useEffect(() => setShuffledQuestions(orderedQuestions), [orderedQuestions]);

  // Supabase へ結果保存（行の作成まで。RID を返す）
  const saveResultsToSupabase = async (
    scores: NormalizedCategoryScores,
    judgedType: SamuraiType,
    answers: { questionId: number; selectedAnswers: string[] }[],
  ): Promise<string | null> => {
    try {
      const generatedUserId =
        globalThis.crypto?.randomUUID?.() ?? `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;

      // FinalizeOnMount へも渡せるスナップショット
      const scorePattern: Record<string, string[]> = Object.fromEntries(
        answers.map(a => [`Q${a.questionId}`, a.selectedAnswers]),
      );

      const resultData: Partial<SamuraiResult> & Record<string, any> = {
        id: generatedUserId,
        score_pattern: scorePattern,     // 回答スナップショット（監査用）
        samurai_type: String(judgedType),// 旧列（互換用）。確定は Finalize API
        name: null,
        email: null,
        company_size: null,
      };

      const { error } = await supabase.from('samurairesults').insert(resultData).select();
      if (error) {
        console.error('Error saving results to Supabase:', error);
        return null;
      }
      setUserId(generatedUserId);
      return generatedUserId;
    } catch (error) {
      console.error('Error generating UUID or saving to Supabase:', error);
      return null;
    }
  };

  const startQuiz = () => {
    setCurrentStep('q1');
    setSelectedAnswers([]);
    setAllAnswers([]);
    setFinalScores(null);
    setSamuraiType(null);
    setUserId(null);
  };

  const nextQuestion = async () => {
    const currentPos = parseInt(String(currentStep).replace('q', ''), 10);
    const currentQuestion = shuffledQuestions[currentPos - 1];
    if (!currentQuestion) return;

    // 未回答ガード
    if (selectedAnswers.length === 0) {
      alert('少なくとも1つは選んでください。');
      return;
    }

    const newAnswer = { questionId: currentQuestion.id, selectedAnswers: [...selectedAnswers] };
    const updatedAllAnswers = [...allAnswers, newAnswer];
    setAllAnswers(updatedAllAnswers);

    if (currentPos < shuffledQuestions.length) {
      setCurrentStep(`q${currentPos + 1}` as `q${number}`);
    } else {
      // ===== 最終計算 =====
      const pattern: Record<string, string[]> = Object.fromEntries(
        updatedAllAnswers.map(a => [`Q${a.questionId}`, a.selectedAnswers]),
      );
      const scores = debugScoreCalculation(pattern, updatedAllAnswers) as NormalizedCategoryScores;
      setFinalScores(scores);

      const judged = judgeSamuraiType(scores);
      setSamuraiType(judged);

      const comments = generateScoreComments(scores as unknown as any);
      setGeneratedComments(comments);

      // /result ページが読むため localStorage に保存
      try {
        localStorage.setItem('samurai-final-scores', JSON.stringify(scores));
        localStorage.setItem('samurai-type', JSON.stringify(String(judged)));
        localStorage.setItem('samurai-comments', JSON.stringify(comments));
        localStorage.setItem('samurai-score-pattern', JSON.stringify(pattern));
      } catch { /* ignore */ }

      // DB保存（RID 取得）
      const rid = await saveResultsToSupabase(scores, judged, updatedAllAnswers);

      // このページでも一応結果は描ける（互換）
      setCurrentStep('result');

      // 親から責任を持って /result へ遷移（RID があれば付与）
      setTimeout(() => {
        const q = rid ? `?rid=${encodeURIComponent(rid)}` : '';
        router.push(`/result${q}`);
      }, 50);
    }

    // 現問の選択はクリア
    setSelectedAnswers([]);
  };

  const prevQuestion = () => {
    const currentPos = parseInt(String(currentStep).replace('q', ''), 10);
    if (currentPos > 1) {
      const prevQuestion = shuffledQuestions[currentPos - 2];
      setCurrentStep(`q${currentPos - 1}` as `q${number}`);
      if (prevQuestion) {
        const prevStored = allAnswers.find((a) => a.questionId === prevQuestion.id);
        setSelectedAnswers(prevStored ? [...prevStored.selectedAnswers] : []);
        setAllAnswers(allAnswers.filter((a) => a.questionId !== prevQuestion.id));
      } else {
        setSelectedAnswers([]);
      }
    }
  };

  // ===== スタート画面 =====
  if (currentStep === 'start') return <StartScreen startQuiz={startQuiz} />;

  // ===== 結果画面（互換：このページでも表示できる） =====
  if (currentStep === 'result') {
    return (
      <div className="min-h-screen bg-white text-black flex flex-col items-center justify-center">
        <ResultPanel
          rid={userId ?? ''}
          finalScores={finalScores as unknown as Record<string, unknown> | null}
          samuraiType={(samuraiType ?? '') as unknown as string}
          comments={generatedComments}
          onRestart={startQuiz}
        />
      </div>
    );
  }

  // ===== 質問画面（q1, q2, ...） =====
  if (String(currentStep).startsWith('q')) {
    const position = parseInt(String(currentStep).replace('q', ''), 10);
    const currentQuestion = shuffledQuestions[position - 1];
    const total = shuffledQuestions.length;

    if (!currentQuestion) {
      return (
        <div className="min-h-screen bg-white text-black flex flex-col items-center justify-center">
          <div className="text-center">
            <h2 className="text-2xl font-bold mb-4">質問が見つかりません</h2>
            <p className="text-gray-600">質問データの読み込み中です...</p>
          </div>
        </div>
      );
    }

    const blockTitle = blockTitleByFirstPosition[position];
    const progress = Math.round((position / total) * 100);

    return (
      <QuizQuestion
        questionNumber={position}
        totalQuestions={total}
        progressPercentage={progress}
        noteText={blockTitle}
        questionText={currentQuestion.questionText}
        options={currentQuestion.options}
        selectedAnswers={selectedAnswers}
        isMultipleChoice={currentQuestion.isMultipleChoice}
        onAnswerChange={
          currentQuestion.isMultipleChoice
            ? (v) =>
                setSelectedAnswers((prev) => {
                  const isNone = NONE_LABELS.has(v);
                  if (prev.includes(v)) return prev.filter((x) => x !== v);
                  if (isNone) return [v];
                  const withoutNone = prev.filter((x) => !NONE_LABELS.has(x));
                  if (withoutNone.length >= 3) return withoutNone;
                  return [...withoutNone, v];
                })
            : (v) => setSelectedAnswers([v])
        }
        onNext={nextQuestion}
        onPrev={prevQuestion}
        canGoBack={position > 1}
      />
    );
  }

  // フォールバック
  return (
    <div className="min-h-screen bg-white text-black flex flex-col items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">エラー</h2>
        <p className="text-gray-600">予期しない状態です</p>
      </div>
    </div>
  );
}
