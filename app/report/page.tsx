// app/page.tsx
'use client';

import React, { useEffect, useMemo, useState } from 'react';
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
import { DISPLAY_ORDER, blockTitleByFirstPosition } from '@/lib/quizBlocks';

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
  const [shareOpen, setShareOpen] = useState(false);

  // ❶ 表示順に並び替えた設問（選択肢だけランダム）
  const orderedQuestions = useMemo<QuizQuestionType[]>(() => {
    const byId = new Map(quizQuestions.map((q) => [q.id, q]));
    return DISPLAY_ORDER
      .map((id) => byId.get(id))
      .filter((q): q is QuizQuestionType => Boolean(q))
      .map((q) => ({ ...q, options: shuffleArray(q.options) }));
  }, []);

  useEffect(() => {
    setShuffledQuestions(orderedQuestions);
  }, [orderedQuestions]);

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy text: ', err);
    }
  };

  // Supabase へ結果保存
  const saveResultsToSupabase = async (
    scores: CategoryScores,
    samuraiType: SamuraiType,
    answers: { questionId: number; selectedAnswers: string[] }[],
  ) => {
    try {
      const generatedUserId =
        globalThis.crypto?.randomUUID?.() ?? `id_${Date.now()}_${Math.random().toString(16).slice(2)}`;

      const scorePattern: Record<string, string[]> = {};
      answers.forEach((a) => {
        scorePattern[`Q${a.questionId}`] = a.selectedAnswers;
      });

      const resultData: Partial<SamuraiResult> & Record<string, any> = {
        id: generatedUserId,
        score_pattern: scorePattern,
        result_type: samuraiType,
        name: null,
        email: null,
        company_size: null,
      };

      const { error } = await supabase.from('samurairesults').insert(resultData).select();
      if (error) console.error('Error saving results to Supabase:', error);
      else setUserId(generatedUserId);
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
    const currentPos = parseInt(String(currentStep).replace('q', ''), 10);

    // 現在の設問IDを position から取得
    const currentQuestion = shuffledQuestions[currentPos - 1];
    if (!currentQuestion) return;

    const newAnswer = { questionId: currentQuestion.id, selectedAnswers: [...selectedAnswers] };
    const updatedAllAnswers = [...allAnswers, newAnswer];
    setAllAnswers(updatedAllAnswers);

    if (currentPos < shuffledQuestions.length) {
      setCurrentStep(`q${currentPos + 1}` as `q${number}`);
    } else {
      const scores = calculateCategoryScores(updatedAllAnswers);
      setFinalScores(scores);

      const judgedSamuraiType = judgeSamuraiType(scores);
      setSamuraiType(judgedSamuraiType);

      const comments = generateScoreComments(scores);
      setGeneratedComments(comments);

      await saveResultsToSupabase(scores, judgedSamuraiType, updatedAllAnswers);
      debugScoreCalculation(updatedAllAnswers);

      setCurrentStep('result');
    }
    setSelectedAnswers([]);
  };

  const prevQuestion = () => {
    const currentPos = parseInt(String(currentStep).replace('q', ''), 10);
    if (currentPos > 1) {
      // ひとつ前の設問IDを取得 → そのIDに対応する回答を復元
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

  // 複数選択：最大3つまで。該当なしは単独選択。
  const handleCheckboxChangeCapped = (value: string, cap = 3) => {
    setSelectedAnswers((prev) => {
      const isNone = NONE_LABELS.has(value);
      if (prev.includes(value)) return prev.filter((v) => v !== value);
      if (isNone) return [value];
      const withoutNone = prev.filter((v) => !NONE_LABELS.has(v));
      if (withoutNone.length >= cap) return withoutNone;
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

          {samuraiType && (
            <div className="mb-6 p-6 bg-gradient-to-r from-red-50 to-orange-50 border-2 border-red-200 rounded-lg">
              <h1 className="text-4xl md:text-5xl font-bold text-red-700 mb-4">{samuraiType}</h1>
              <p className="text-lg md:text-xl text-gray-700 leading-relaxed">
                {samuraiDescriptions[samuraiType]}
              </p>

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

              <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
                <Button variant="secondary" onClick={() => setShareOpen(true)}>
                  <Share2 className="w-4 h-4 mr-2" />
                  あなたの武将型をシェアする
                </Button>
              </div>
            </div>
          )}

          <ShareModal
            open={shareOpen}
            onClose={() => setShareOpen(false)}
            text={`私は「${samuraiType ?? '武将'}」型だったよ！武将タイプ診断やってみた😄`}
            subtitle="投稿前に内容をご確認ください。"
          />

          {finalScores && (
            <div className="space-y-4 text-left">
              <h3 className="text-xl font-semibold mb-4 text-center">カテゴリ別スコア（0〜3点）</h3>
              {Object.entries(finalScores).map(([category, score]) => {
                const emojiLabel = getEmojiLabel(score);
                const color = score >= 2.5 ? 'text-green-600' : score >= 2.0 ? 'text-yellow-600' : 'text-red-600';
                return (
                  <div key={category} className="flex justify-between items-center p-3 bg-gray-50 rounded">
                    <span className="font-medium">{category}</span>
                    <div className="flex items-center">
                      <span className={`text-lg font-bold ${color}`}>{Math.min(score, 3).toFixed(2)}点</span>
                      <span className="text-sm font-medium text-gray-800 ml-2">{emojiLabel}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

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

          <div className="mt-12 text-center">
            <p className="text-gray-600 text-sm mb-2">※ご希望の方には、こんなレポートを無料でお届け！</p>
            <img src="/images/reportSample.png" alt="詳細レポートのサンプル画像" className="mx-auto w-[300px] rounded-lg shadow-md" />
          </div>

          <div className="mt-8 space-y-4">
            <button
              onClick={startQuiz}
              className="bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-8 rounded-lg text-lg transition-colors shadow-lg hover:shadow-xl mr-4"
            >
              もう一度診断する
            </button>
            <button
              onClick={() => (window.location.href = `/form${userId ? `?resultId=${userId}` : ''}`)}
              className="bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-lg text-lg transition-colors shadow-lg hover:shadow-xl"
            >
              あなた専用の詳細レポートを受け取る（無料）
            </button>
          </div>
        </div>

        <a
          href="https://ourdx-mtg.com/"
          target="_blank"
          rel="noopener noreferrer"
          className="mt-8 flex items-center justify-center text-gray-500 text-sm space-x-2 hover:text-gray-700"
        >
          <img src="/images/logo.png" alt="企業の未来づくり研究所ロゴ" className="w-[40px] h-auto opacity-70 hover:opacity-90" />
          <span>© 一般社団法人 企業の未来づくり研究所</span>
        </a>
      </div>
    );
  }

  // 質問画面（q1, q2, ...）
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

    // ❷ ブロック見出し：ポジション基準
    const blockTitle = blockTitleByFirstPosition[position];

    // ❸ 進捗％は動的に計算（並び替えの影響を回避）
    const progress = Math.round((position / total) * 100);

    return (
      <QuizQuestion
        questionNumber={position}
        totalQuestions={total}
        progressPercentage={progress}
        // 見出し（小タグ）は QuizQuestion 側の noteText を使わず、タイトル上に別途出しているなら不要
        noteText={blockTitle}
        questionText={currentQuestion.questionText}
        options={currentQuestion.options}
        selectedAnswers={selectedAnswers}
        isMultipleChoice={currentQuestion.isMultipleChoice}
        onAnswerChange={
          currentQuestion.isMultipleChoice ? (v) => handleCheckboxChangeCapped(v, 3) : handleRadioChange
        }
        onNext={nextQuestion}
        onPrev={prevQuestion}
        canGoBack={position > 1}
      />
    );
  }

  return (
    <div className="min-h-screen bg-white text-black flex flex-col items-center justify-center">
      <div className="text-center">
        <h2 className="text-2xl font-bold mb-4">エラー</h2>
        <p className="text-gray-600">予期しない状態です</p>
      </div>
    </div>
  );
}
