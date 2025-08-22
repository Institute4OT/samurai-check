// app/page.tsx
'use client';

import React, { useEffect, useState } from 'react';
import StartScreen from '@/components/StartScreen';
import QuizQuestion from '@/components/QuizQuestion';
import { quizQuestions, QuizQuestion as QuizQuestionType } from '@/lib/quizQuestions';
import { shuffleArray } from '@/lib/utils';
import { calculateCategoryScores, debugScoreCalculation, CategoryScores } from '@/lib/scoringSystem';
import { judgeSamuraiType, samuraiDescriptions, SamuraiType } from '@/lib/samuraiJudge';
import { supabase, SamuraiResult } from '@/lib/supabase';
import { generateScoreComments } from '@/lib/generateScoreComments';
import { Copy, Check, Share2 } from 'lucide-react';
import ShareModal from '@/components/common/ShareModal';
import { Button } from '@/components/ui/button';

// スコアに応じたラベル
function getEmojiLabel(score: number): string {
  if (score >= 2.5) return '😄 良好';
  if (score >= 1.5) return '😐 注意';
  if (score >= 1.0) return '😰 ややリスク';
  return '😱 重大リスク';
}

// 「該当なし」系のラベル（同時選択不可）
const NONE_LABELS = new Set(['該当するものはない', '該当なし', '特になし']);

export default function Home() {
  const [currentStep, setCurrentStep] = useState<'start' | `q${number}` | 'result'>('start');
  const [selectedAnswers, setSelectedAnswers] = useState<string[]>([]);
  const [shuffledQuestions, setShuffledQuestions] = useState<QuizQuestionType[]>([]);
  const [allAnswers, setAllAnswers] = useState<{ questionId: number; selectedAnswers: string[] }[]>([]);
  const [finalScores, setFinalScores] = useState<CategoryScores | null>(null);
  const [samuraiType, setSamuraiType] = useState<SamuraiType | null>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [generatedComments, setGeneratedComments] = useState<{ strengths: string[]; tips: string[] }>({
    strengths: [],
    tips: [],
  });
  const [copied, setCopied] = useState(false);

  // シェアモーダル
  const [shareOpen, setShareOpen] = useState(false);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  // 質問の選択肢を一度だけシャッフル
  useEffect(() => {
    const questionsWithShuffledOptions = quizQuestions.map((q) => ({
      ...q,
      options: shuffleArray(q.options),
    }));
    setShuffledQuestions(questionsWithShuffledOptions);
  }, []);

  // Supabase へ結果保存（created_at は DB の DEFAULT に任せる）
  const saveResultsToSupabase = async (
    scores: CategoryScores,
    samuraiType: SamuraiType,
    answers: { questionId: number; selectedAnswers: string[] }[],
  ) => {
    try {
      const generatedUserId =
        globalThis.crypto?.randomUUID?.() ?? `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;

      // score_pattern 生成
      const scorePattern: Record<string, string[]> = {};
      answers.forEach((a) => {
        scorePattern[`Q${a.questionId}`] = a.selectedAnswers;
      });

      // DB 挿入データ
      const resultData: Partial<SamuraiResult> & Record<string, any> = {
        id: generatedUserId,
        score_pattern: scorePattern,
        result_type: samuraiType,
        name: null,
        email: null,
        company_size: null,
      };

      const { error } = await supabase.from('samurairesults').insert(resultData).select();

      if (error) {
        console.error('Error saving results to Supabase:', error);
      } else {
        console.log(`保存完了：${generatedUserId}`);
        setUserId(generatedUserId);
      }
    } catch (error) {
      console.error('Error generating UUID or saving to Supabase:', error);
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
    const currentQuestionNumber = parseInt(String(currentStep).replace('q', ''), 10);

    // 現在の回答を保存
    const newAnswer = { questionId: currentQuestionNumber, selectedAnswers: [...selectedAnswers] };
    const updatedAllAnswers = [...allAnswers, newAnswer];
    setAllAnswers(updatedAllAnswers);

    console.log(`Q${currentQuestionNumber}の回答:`, selectedAnswers);

    if (currentQuestionNumber < quizQuestions.length) {
      setCurrentStep(`q${currentQuestionNumber + 1}` as `q${number}`);
    } else {
      // スコア計算
      const scores = calculateCategoryScores(updatedAllAnswers);
      setFinalScores(scores);

      // 武将タイプ判定
      const judgedSamuraiType = judgeSamuraiType(scores);
      setSamuraiType(judgedSamuraiType);

      // コメント生成
      const comments = generateScoreComments(scores);
      setGeneratedComments(comments);

      // Supabase に結果を保存（1回だけ呼ぶ）
      await saveResultsToSupabase(scores, judgedSamuraiType, updatedAllAnswers);

      // デバッグ出力
      debugScoreCalculation(updatedAllAnswers);
      console.log('判定された戦国武将タイプ:', judgedSamuraiType);

      setCurrentStep('result');
    }

    setSelectedAnswers([]);
  };

  const prevQuestion = () => {
    const currentQuestionNumber = parseInt(String(currentStep).replace('q', ''), 10);
    if (currentQuestionNumber > 1) {
      setCurrentStep(`q${currentQuestionNumber - 1}` as `q${number}`);
      const prevAnswerIndex = currentQuestionNumber - 2; // 0-based
      if (prevAnswerIndex >= 0 && prevAnswerIndex < allAnswers.length) {
        const prevAnswer = allAnswers[prevAnswerIndex];
        setSelectedAnswers([...prevAnswer.selectedAnswers]);
        setAllAnswers(allAnswers.slice(0, prevAnswerIndex));
      } else {
        setSelectedAnswers([]);
      }
    }
  };

  // 複数選択：最大3つまで。該当なしは単独選択。
  const handleCheckboxChangeCapped = (value: string, cap = 3) => {
    setSelectedAnswers((prev) => {
      const isNone = NONE_LABELS.has(value);

      // すでに選択 → 解除
      if (prev.includes(value)) {
        return prev.filter((v) => v !== value);
      }

      // 「該当なし」系 → それ単体
      if (isNone) {
        return [value];
      }

      // 現在選択から「該当なし」を除去
      const withoutNone = prev.filter((v) => !NONE_LABELS.has(v));

      // cap 超過なら弾く
      if (withoutNone.length >= cap) {
        return withoutNone; // これ以上は選べない
      }
      return [...withoutNone, value];
    });
  };

  const handleRadioChange = (value: string) => setSelectedAnswers([value]);

  // スタート画面
  if (currentStep === 'start') return <StartScreen startQuiz={startQuiz} />;

  // 結果画面
  if (currentStep === 'result') {
    return (
      <div className="min-h-screen bg-white text-black flex flex-col items-center justify-center">
        <div className="text-center max-w-4xl mx-auto p-8">
          <h2 className="text-2xl font-bold mb-8">診断結果</h2>

          {/* 武将タイプカード */}
          {samuraiType && (
            <div className="mb-6 p-6 bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200 rounded-lg">
              <h1 className="text-4xl md:text-5xl font-bold text-red-700 mb-4">{samuraiType}</h1>
              <p className="text-lg md:text-xl text-gray-700 leading-relaxed">
                {samuraiDescriptions[samuraiType]}
              </p>

              {/* 診断ID + コピー */}
              {userId && (
                <div className="flex items-center justify-center mt-4 space-x-2">
                  <p className="text-sm text-gray-500">診断ID: {userId}</p>
                  <button
                    onClick={() => copyToClipboard(userId)}
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    title="診断IDをコピー"
                  >
                    {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
                  </button>
                </div>
              )}

              {/* シェア（モーダル起動） */}
              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                <Button variant="secondary" onClick={() => setShareOpen(true)}>
                  <Share2 className="w-4 h-4 mr-2" />
                  あなたの武将型をシェアする
                </Button>
              </div>
            </div>
          )}

          {/* シェアモーダル本体 */}
          <ShareModal
            open={shareOpen}
            onClose={() => setShareOpen(false)}
            text={`私は「${samuraiType ?? '武将'}」型だったよ！武将タイプ診断やってみた😄`}
            subtitle="投稿前に内容をご確認ください。"
          />

          {/* カテゴリ別スコア */}
          {finalScores && (
            <div className="space-y-4 text-left">
              <h3 className="text-xl font-semibold mb-4 text-center">カテゴリ別スコア（0〜3点）</h3>
              {Object.entries(finalScores).map(([category, score]) => {
                const emojiLabel = getEmojiLabel(score);
                const getScoreColor = (s: number) =>
                  s >= 2.5 ? 'text-green-600' : s >= 2.0 ? 'text-yellow-600' : 'text-red-600';
                return (
                  <div key={category} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span className="font-medium">{category}</span>
                    <div className="flex items-center">
                      <span className={`text-lg font-bold ${getScoreColor(score)}`}>{Math.min(score, 3).toFixed(2)}点</span>
                      <span className="text-sm font-medium text-gray-800 ml-2">{emojiLabel}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          {/* 特徴とヒント */}
          {(generatedComments.strengths.length > 0 || generatedComments.tips.length > 0) && (
            <div className="mt-8 text-left max-w-3xl mx-auto">
              <h3 className="text-lg font-semibold mb-2">🔍 あなたの特徴とヒント</h3>

              {generatedComments.strengths.length > 0 && (
                <div className="mb-4">
                  <h4 className="font-semibold text-green-700 mb-1">あなたの強み</h4>
                  <ul className="list-disc list-inside text-green-800">
                    {generatedComments.strengths.map((item, idx) => (
                      <li key={`strength-${idx}`}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}

              {generatedComments.tips.length > 0 && (
                <div>
                  <h4 className="font-semibold text-orange-700 mb-1">改善のヒント</h4>
                  <ul className="list-disc list-inside text-orange-800">
                    {generatedComments.tips.map((item, idx) => (
                      <li key={`tip-${idx}`}>{item}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}

          {/* Report Preview */}
          <div className="mt-12 text-center">
            <p className="text-gray-600 text-sm mb-2">※ご希望の方には、こんなレポートを無料でお届け！</p>
            <img
              src="/images/reportSample.png"
              alt="詳細レポートのサンプル画像"
              className="mx-auto w-[300px] rounded-lg shadow-md"
            />
          </div>

          <div className="mt-8 space-y-4">
            <button
              onClick={startQuiz}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-lg text-lg transition-colors duration-200 shadow-lg hover:shadow-xl mr-4"
            >
              もう一度診断する
            </button>
            <button
              onClick={() => (window.location.href = `/form${userId ? `?resultId=${userId}` : ''}`)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg text-lg transition-colors duration-200 shadow-lg hover:shadow-xl"
            >
              あなた専用の詳細レポートを受け取る（無料）
            </button>
          </div>
        </div>

        {/* Footer */}
        <a
          href="https://ourdx-mtg.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-8 flex items-center justify-center text-gray-500 text-sm space-x-2 hover:text-gray-700 transition-colors duration-200"
        >
          <img
            src="/images/logo.png"
            alt="企業の未来づくり研究所ロゴ"
            className="w-[40px] h-auto opacity-70 hover:opacity-90 transition-opacity duration-200"
          />
          <span>© 一般社団法人 企業の未来づくり研究所</span>
        </a>
      </div>
    );
  }

  // 質問画面（q1, q2, ...）
  if (String(currentStep).startsWith('q')) {
    const questionNumber = parseInt(String(currentStep).replace('q', ''), 10);
    const currentQuestion = shuffledQuestions[questionNumber - 1];

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

    return (
      <QuizQuestion
        questionNumber={questionNumber}
        totalQuestions={quizQuestions.length}
        progressPercentage={currentQuestion.progressPercentage}
        questionText={currentQuestion.questionText}
        options={currentQuestion.options}
        selectedAnswers={selectedAnswers}
        isMultipleChoice={currentQuestion.isMultipleChoice}
        onAnswerChange={currentQuestion.isMultipleChoice ? (v) => handleCheckboxChangeCapped(v, 3) : handleRadioChange}
        onNext={nextQuestion}
        onPrev={prevQuestion}
        canGoBack={questionNumber > 1}
        // 注記は表示しない（設問文に統一）
        // noteText={currentQuestion.isMultipleChoice ? '複数選択・最大3つまで' : undefined}
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
