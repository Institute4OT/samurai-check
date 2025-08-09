// app/form/page.tsx
'use client';

import { useEffect, useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import Footer from '@/components/Footer';
import { supabase } from '@/lib/supabase';
import {
  ShieldCheck,
  Target,
  Brain,
  Sparkles,
  Lock,
  Clock,
  ArrowRight,
} from 'lucide-react';

type FetchState = 'idle' | 'loading' | 'ok' | 'invalid';
type SaveState = 'idle' | 'saving' | 'success' | 'error';
type Step = 'intro' | 'form';

export default function FormPage() {
  const sp = useSearchParams();
  const resultId = useMemo(() => (sp.get('resultId') || '').trim(), [sp]);

  const [fetchState, setFetchState] = useState<FetchState>('idle');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [errorMsg, setErrorMsg] = useState<string>('');
  const [step, setStep] = useState<Step>('intro');

  // 必須
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [ageRange, setAgeRange] = useState(''); // 年齢は必須
  const [agree, setAgree] = useState(false);

  // 任意
  const [companySize, setCompanySize] = useState('');
  const [industry, setIndustry] = useState('');

  // 初期チェック＆既存値の取得
  useEffect(() => {
    const run = async () => {
      if (!resultId || resultId.length < 10) {
        setFetchState('invalid');
        return;
      }
      setFetchState('loading');

      const { data, error } = await supabase
        .from('samurairesults')
        .select('id, name, email, age_range, company_size, industry')
        .eq('id', resultId)
        .maybeSingle();

      if (error) {
        setErrorMsg(`初期取得エラー: ${error.message}`);
        setFetchState('invalid');
        return;
      }

      if (data) {
        if (data.name) setName(data.name);
        if (data.email) setEmail(data.email);
        if (data.age_range) setAgeRange(data.age_range);
        if (data.company_size) setCompanySize(data.company_size);
        if (data.industry) setIndustry(data.industry);
      }

      setFetchState('ok');
      setStep('intro'); // まずはワンクッション画面から
    };

    run();
  }, [resultId]);

  const validEmail = (t: string) => /\S+@\S+\.\S+/.test(t.trim());
  const canSubmit =
    fetchState === 'ok' &&
    saveState !== 'saving' &&
    name.trim().length > 0 &&
    validEmail(email) &&
    ageRange.trim().length > 0 &&
    agree;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!canSubmit) return;

    setSaveState('saving');
    setErrorMsg('');

    const payload = {
      id: resultId,
      name: name.trim(),
      email: email.trim(),
      age_range: ageRange,
      company_size: companySize || null,
      industry: industry.trim() || null,
      // created_at は DB の DEFAULT now() に任せる
    };

    const { error } = await supabase
      .from('samurairesults')
      .upsert(payload, { onConflict: 'id' })
      .select()
      .maybeSingle();

    if (error) {
      setSaveState('error');
      setErrorMsg(`保存エラー: ${error.message}`);
      return;
    }

    setSaveState('success');
  };

  // ① URL不正
  if (fetchState === 'invalid') {
    return (
      <div className="mx-auto max-w-xl px-4 sm:px-6 py-8">
        <h1 className="text-xl font-bold mb-2">URLエラー</h1>
        <p className="text-red-700 mb-4">resultId が不正です。診断スタートからやり直してください。</p>
        {errorMsg && <p className="text-xs text-gray-600">詳細: {errorMsg}</p>}
        <a href="/" className="underline text-blue-600 hover:text-blue-800">診断スタート画面へ</a>
      </div>
    );
  }

  // ② ローディング
  if (fetchState === 'loading' || fetchState === 'idle') {
    return <div className="mx-auto max-w-xl px-4 sm:px-6 py-8">読み込み中…</div>;
  }

  // ③ Step1: 色付きワンクッション画面（モバイル最適化）
  if (step === 'intro') {
    return (
      <div className="relative">
        {/* 背景：淡い金→白グラデ＋上部ハイライト */}
        <div className="absolute inset-0 -z-10 bg-gradient-to-b from-amber-50 via-white to-white" />
        <div className="absolute inset-x-0 top-0 -z-10 h-40 bg-[radial-gradient(ellipse_at_top,rgba(234,179,8,0.28),transparent_60%)]" />

        <div className="mx-auto max-w-3xl px-4 sm:px-6 pt-6 pb-28 md:pb-12">
          {/* ステップ表示 */}
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-amber-200 bg-white/70 px-3 py-1 text-xs text-amber-800">
            <Sparkles className="h-3.5 w-3.5" />
            Step 1 / 2　—　詳細レポートのご案内
          </div>

          {/* 見出し */}
          <h1 className="text-[22px] sm:text-2xl md:text-3xl font-extrabold tracking-tight text-zinc-900 leading-snug">
            診断結果は、まだ<strong className="text-rose-700">全体像のほんの一部</strong>です
          </h1>
          <div className="mt-2 h-1 w-24 sm:w-28 rounded-full bg-gradient-to-r from-amber-400 to-rose-400" />

          <p className="mt-4 text-[15px] sm:text-base text-zinc-700 leading-relaxed">
            いま見えているのは、あなたの経営スタイルと組織の傾向のごく一部。残りには、
            <span className="font-semibold">強みが最も活きる場面</span>、
            <span className="font-semibold">3ヶ月で伸ばせるポイント</span>、
            <span className="font-semibold">意思決定のクセ</span>が隠れています。
          </p>

          {/* 3カード：縦並び＆余白広め */}
          <div className="mt-6 grid gap-5 md:grid-cols-3 md:gap-4">
            <div className="group rounded-2xl border border-amber-200 bg-white p-4 shadow-sm ring-1 ring-amber-100 hover:shadow-md hover:ring-amber-200 transition">
              <div className="mb-2 inline-flex items-center gap-2">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-amber-100">
                  <ShieldCheck className="h-4.5 w-4.5 text-amber-700" />
                </span>
                <span className="text-sm font-semibold text-zinc-900">強みの活かし方</span>
              </div>
              <p className="text-sm text-zinc-600">
                どの場面で最大化できるか、<span className="text-amber-700 font-medium">実行ヒント付き</span>で提示。
              </p>
            </div>

            <div className="group rounded-2xl border border-rose-200 bg-white p-4 shadow-sm ring-1 ring-rose-100 hover:shadow-md hover:ring-rose-200 transition">
              <div className="mb-2 inline-flex items-center gap-2">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-rose-100">
                  <Target className="h-4.5 w-4.5 text-rose-700" />
                </span>
                <span className="text-sm font-semibold text-zinc-900">改善の優先順位</span>
              </div>
              <p className="text-sm text-zinc-600">
                今月取り組むべき<span className="text-rose-700 font-medium">“たった一つ”</span>を特定。
              </p>
            </div>

            <div className="group rounded-2xl border border-indigo-200 bg-white p-4 shadow-sm ring-1 ring-indigo-100 hover:shadow-md hover:ring-indigo-200 transition">
              <div className="mb-2 inline-flex items-center gap-2">
                <span className="inline-flex h-9 w-9 items-center justify-center rounded-full bg-indigo-100">
                  <Brain className="h-4.5 w-4.5 text-indigo-700" />
                </span>
                <span className="text-sm font-semibold text-zinc-900">意思決定のクセ</span>
              </div>
              <p className="text-sm text-zinc-600">
                無自覚になりやすいパターンを<span className="text-indigo-700 font-medium">短文で可視化</span>。
              </p>
            </div>
          </div>

          {/* 情報帯：3点バッジ */}
          <div className="mt-6 grid gap-3 md:grid-cols-3">
            <div className="rounded-xl border border-amber-200 bg-amber-50/70 px-4 py-3 text-sm text-amber-900 inline-flex items-center gap-2">
              <Clock className="h-4 w-4" /> 所要時間：1分
            </div>
            <div className="rounded-xl border border-emerald-200 bg-emerald-50/70 px-4 py-3 text-sm text-emerald-900 inline-flex items-center gap-2">
              <ShieldCheck className="h-4 w-4" /> 無料でお届け
            </div>
            <div className="rounded-xl border border-zinc-200 bg-zinc-50/80 px-4 py-3 text-sm text-zinc-800 inline-flex items-center gap-2">
              <Lock className="h-4 w-4" /> 個人情報はレポート送付にのみ使用
            </div>
          </div>

          {/* 上部CTA（PC/タブレット表示、モバイルは下部固定バーを表示） */}
          <div className="mt-6 hidden md:flex items-center gap-4">
            <Button
              onClick={() => setStep('form')}
              className="rounded-xl px-5 py-2 bg-rose-700 hover:bg-rose-800 text-white shadow-lg hover:shadow-rose-200/60 inline-flex items-center gap-2"
            >
              詳細レポートを申し込む
              <ArrowRight className="h-4 w-4" />
            </Button>
            <a
              href={`/result?resultId=${resultId}`}
              className="text-sm underline text-zinc-600 hover:text-zinc-800"
            >
              診断結果に戻る
            </a>
          </div>

          <Footer />
        </div>

        {/* モバイル固定CTAバー */}
        <div className="md:hidden fixed inset-x-0 bottom-0 z-20 border-t border-rose-200 bg-white/95 backdrop-blur supports-[backdrop-filter]:bg-white/75">
          <div className="mx-auto max-w-3xl px-4 py-3 flex flex-col gap-2">
            <Button
              onClick={() => setStep('form')}
              className="w-full rounded-xl py-3 bg-rose-700 hover:bg-rose-800 text-white shadow-md inline-flex items-center justify-center gap-2"
            >
              詳細レポートを申し込む
              <ArrowRight className="h-4 w-4" />
            </Button>
            <a
              href={`/result?resultId=${resultId}`}
              className="text-center text-sm underline text-zinc-600 hover:text-zinc-800"
            >
              診断結果に戻る
            </a>
          </div>
        </div>
      </div>
    );
  }

  // ④ Step2: 入力フォーム（モバイル最適化）
  return (
    <div className="mx-auto max-w-xl px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-bold mb-2">詳細レポートお申込み</h1>
      <div className="mb-6 inline-flex items-center gap-2 rounded-full border border-zinc-200 bg-zinc-50 px-3 py-1 text-xs text-zinc-700">
        Step 2 / 2　—　基本情報の入力
      </div>

      <form onSubmit={onSubmit} className="space-y-6">
        <input type="hidden" name="resultId" value={resultId} />

        {/* お名前（必須） */}
        <div className="space-y-2">
          <Label htmlFor="name">お名前 <span className="text-red-600">*</span></Label>
          <Input
            id="name"
            autoComplete="name"
            className="py-3"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例）山田 太郎"
            required
          />
          {!name.trim() && <p className="text-xs text-red-600">お名前を入力してください。</p>}
        </div>

        {/* メール（必須） */}
        <div className="space-y-2">
          <Label htmlFor="email">メールアドレス <span className="text-red-600">*</span></Label>
          <Input
            id="email"
            className="py-3"
            autoComplete="email"
            inputMode="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="例）taro@example.com"
            type="email"
            required
          />
          {email.trim() && !validEmail(email) && (
            <p className="text-xs text-red-600">メール形式が正しくありません。</p>
          )}
        </div>

        {/* 年齢（必須） */}
        <div className="space-y-2">
          <Label htmlFor="age_range">年齢 <span className="text-red-600">*</span></Label>
          <select
            id="age_range"
            className="w-full rounded-md border px-3 py-3"
            value={ageRange}
            onChange={(e) => setAgeRange(e.target.value)}
            required
          >
            <option value="">--選択してください--</option>
            <option value="〜39歳">〜39歳</option>
            <option value="40〜49歳">40〜49歳</option>
            <option value="50〜59歳">50〜59歳</option>
            <option value="60〜69歳">60〜69歳</option>
            <option value="70歳以上">70歳以上</option>
          </select>
          {!ageRange.trim() && <p className="text-xs text-red-600">年齢を選択してください。</p>}
        </div>

        {/* 会社規模（任意） */}
        <div className="space-y-2">
          <Label htmlFor="company_size">会社規模（任意）</Label>
          <select
            id="company_size"
            className="w-full rounded-md border px-3 py-3"
            value={companySize}
            onChange={(e) => setCompanySize(e.target.value)}
          >
            <option value="">選択してください</option>
            <option value="~10名">~10名</option>
            <option value="11~50名">11~50名</option>
            <option value="51~100名">51~100名</option>
            <option value="101~300名">101~300名</option>
            <option value="301名~">301名~</option>
          </select>
        </div>

        {/* 業種（任意） */}
        <div className="space-y-2">
          <Label htmlFor="industry">業種（任意）</Label>
          <Input
            id="industry"
            className="py-3"
            autoComplete="organization-title"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            placeholder="例）製造、IT、医療、金融 など"
          />
        </div>

        {/* 同意（必須） */}
        <div className="flex items-start gap-3">
          <Checkbox
            id="agree"
            checked={agree}
            onCheckedChange={(v) => setAgree(Boolean(v))}
            required
          />
          <Label htmlFor="agree" className="text-sm">
            入力情報は詳細レポート送付とご連絡にのみ使用します。送信により当法人のプライバシーポリシーに同意したものとみなします。
          </Label>
        </div>

        {/* 送信ボタン＆状態（モバイルは幅いっぱい） */}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3">
          <Button type="submit" disabled={!canSubmit} className="w-full sm:w-auto py-3">
            {saveState === 'saving' ? '送信中…' : '詳細レポートを申し込む'}
          </Button>
          {saveState === 'success' && <span className="text-green-700 text-sm">送信完了！</span>}
          {saveState === 'error' && <span className="text-red-700 text-sm">保存に失敗しました。</span>}
        </div>

        {saveState === 'error' && errorMsg && (
          <p className="text-xs text-gray-600">詳細: {errorMsg}</p>
        )}

        <hr className="my-6" />
        <div className="text-xs text-gray-500">resultId: <code>{resultId}</code></div>
      </form>

      <Footer />
    </div>
  );
}
