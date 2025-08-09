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

type FetchState = 'idle' | 'loading' | 'ok' | 'invalid' | 'not_found';
type SaveState = 'idle' | 'saving' | 'success' | 'error';

export default function FormPage() {
  const sp = useSearchParams();
  const resultId = useMemo(() => (sp.get('resultId') || '').trim(), [sp]);

  const [fetchState, setFetchState] = useState<FetchState>('idle');
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [errorMsg, setErrorMsg] = useState<string>('');

  // 必須
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [agree, setAgree] = useState(false);

  // 追加項目（任意）
  const [companySize, setCompanySize] = useState('');
  const [industry, setIndustry] = useState('');
  const [consult, setConsult] = useState(false);

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
        .select('id, name, email, company_size, industry, is_consult_request')
        .eq('id', resultId)
        .maybeSingle();

      if (error) {
        setErrorMsg(`初期取得エラー: ${error.message}`);
        setFetchState('invalid');
        return;
      }

      if (!data) {
        // 行がまだ無い場合も、フォーム入力→送信で upsert する前提でOK
        setFetchState('ok');
        return;
      }

      if (data.name) setName(data.name);
      if (data.email) setEmail(data.email);
      if (data.company_size) setCompanySize(data.company_size);
      if (data.industry) setIndustry(data.industry);
      if (data.is_consult_request !== undefined) setConsult(Boolean(data.is_consult_request));

      setFetchState('ok');
    };

    run();
  }, [resultId]);

  const validEmail = (t: string) => /\S+@\S+\.\S+/.test(t.trim());
  const canSubmit =
    fetchState === 'ok' &&
    saveState !== 'saving' &&
    name.trim().length > 0 &&
    validEmail(email) &&
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
      company_size: companySize || null,
      industry: industry.trim() || null,
      is_consult_request: consult,
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

  // 画面：状態別
  if (fetchState === 'invalid') {
    return (
      <div className="mx-auto max-w-xl px-6 py-10">
        <h1 className="text-xl font-bold mb-2">URLエラー</h1>
        <p className="text-red-700 mb-4">resultId が不正です。診断スタートからやり直してください。</p>
        {errorMsg && <p className="text-xs text-gray-600">詳細: {errorMsg}</p>}
        <a href="/" className="underline text-blue-600 hover:text-blue-800">診断スタート画面へ</a>
      </div>
    );
  }
  if (fetchState === 'loading' || fetchState === 'idle') {
    return <div className="mx-auto max-w-xl px-6 py-10">読み込み中…</div>;
  }

  // 画面：フォーム
  return (
    <div className="mx-auto max-w-xl px-6 py-10">
      <h1 className="text-2xl font-bold mb-6">詳細レポートお申込み</h1>

      <form onSubmit={onSubmit} className="space-y-6">
        <input type="hidden" name="resultId" value={resultId} />

        {/* お名前 */}
        <div className="space-y-2">
          <Label htmlFor="name">お名前 <span className="text-red-600">*</span></Label>
          <Input
            id="name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="例）山田 太郎"
            required
          />
          {!name.trim() && <p className="text-xs text-red-600">お名前を入力してください。</p>}
        </div>

        {/* メール */}
        <div className="space-y-2">
          <Label htmlFor="email">メールアドレス <span className="text-red-600">*</span></Label>
          <Input
            id="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="例）taro@example.com"
            inputMode="email"
            type="email"
            required
          />
          {email.trim() && !validEmail(email) && (
            <p className="text-xs text-red-600">メール形式が正しくありません。</p>
          )}
        </div>

        {/* 会社規模（任意） */}
        <div className="space-y-2">
          <Label htmlFor="company_size">会社規模（任意）</Label>
          <select
            id="company_size"
            className="w-full rounded-md border px-3 py-2"
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
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            placeholder="例）製造、IT、医療、金融 など"
          />
        </div>

        {/* 無料相談希望（任意） */}
        <div className="flex items-start gap-3">
          <Checkbox
            id="consult"
            checked={consult}
            onCheckedChange={(v) => setConsult(Boolean(v))}
          />
          <Label htmlFor="consult" className="text-sm">
            無料個別相談を希望する（任意）
          </Label>
        </div>

        {/* 同意 */}
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

        {/* 送信ボタン＆状態 */}
        <div className="flex items-center gap-3">
          <Button type="submit" disabled={!canSubmit}>
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
