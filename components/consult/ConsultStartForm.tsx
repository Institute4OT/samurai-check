// /components/consult/ConsultStartForm.tsx
'use client';

import { useMemo, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import ConsultantPicker from '@/components/consult/ConsultantPicker';
import {
  TOPICS, GOAL_CHOICES, BOTTLENECK_CHOICES, PRIORITY_CHOICES,
  STYLE_OPTIONS, type TopicKey, type StyleKey, type ConsultantKey,
} from '../../lib/consult/constants';
import { useResolvedRidEmail } from '../../lib/hooks/useResolvedRidEmail';

export default function ConsultStartForm() {
  const { rid: resultId, ridLocked, email, setEmail } = useResolvedRidEmail();

  // 必須
  const [name, setName] = useState('');

  // テーマ（必須）
  const [topics, setTopics] = useState<TopicKey[]>([]);
  const [topicOther, setTopicOther] = useState('');

  // 任意の選択群＋自由欄
  const [goalSel, setGoalSel] = useState<string[]>([]);
  const [bottleSel, setBottleSel] = useState<string[]>([]);
  const [prioritySel, setPrioritySel] = useState<string[]>([]);
  const [goalFree, setGoalFree] = useState('');
  const [bottleFree, setBottleFree] = useState('');
  const [priorityFree, setPriorityFree] = useState('');

  // 希望スタイル／担当
  const [style, setStyle] = useState<StyleKey | null>(null);
  const [consultant, setConsultant] = useState<ConsultantKey>('either');

  const canSubmit = useMemo(() => {
    const emailOk = /\S+@\S+\.\S+/.test(email.trim());
    const nameOk = name.trim().length > 0;
    const topicsOk = topics.length > 0 || topicOther.trim().length > 0;
    return emailOk && nameOk && topicsOk;
  }, [email, name, topics, topicOther]);

  const toggleArr = (arr: string[], v: string) =>
    arr.includes(v) ? arr.filter((x) => x !== v) : [...arr, v];

  const toggleTopic = (k: TopicKey) =>
    setTopics((prev) => (prev.includes(k) ? prev.filter((x) => x !== k) : [...prev, k]));

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (!canSubmit) return;

    const fd = new FormData(e.currentTarget);
    fd.set('name', name.trim());
    fd.set('email', email.trim());
    if (resultId) {
      fd.set('rid', resultId);      // 正式名
      fd.set('resultId', resultId); // 互換
    }
    fd.set('assigneePref', consultant);
    if (style) fd.set('style', style);

    // テーマ
    topics.forEach((t) => fd.append('themes', t));
    if (topicOther.trim()) {
      fd.append('themes', 'other');
    }

    // 任意メモを見やすく整形して 1 フィールドに集約
    const blocks: string[] = [];
    if (goalSel.length || goalFree) {
      blocks.push('【到達したい状態】', goalSel.map((s) => `・${s}`).join('\n'), goalFree.trim());
    }
    if (bottleSel.length || bottleFree) {
      blocks.push('【いまのボトルネック・課題】', bottleSel.map((s) => `・${s}`).join('\n'), bottleFree.trim());
    }
    if (prioritySel.length || priorityFree) {
      blocks.push('【優先したいテーマ】', prioritySel.map((s) => `・${s}`).join('\n'), priorityFree.trim());
    }
    if (topicOther.trim()) {
      blocks.push('【その他（自由記入）】', `・${topicOther.trim()}`);
    }
    const note = blocks.filter(Boolean).join('\n');
    if (note) fd.set('note', note);

    // API は /consult/booking
    const res = await fetch('/consult/booking', { method: 'POST', body: fd });
    const json = await res.json().catch(() => ({} as any));

    if (res.ok && (json as any)?.ok) {
      if ((json as any).bookingUrl) {
        window.location.href = String((json as any).bookingUrl);
      } else {
        alert('送信しました。担当より折り返しご連絡します。');
      }
    } else {
      console.error('[consult booking] failed:', json);
      alert(`送信に失敗しました：${(json as any)?.error || res.statusText}`);
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-bold">【詳細レポート特典】無料相談のお申込み</h1>
      <p className="text-sm text-muted-foreground mt-1">
        入力は1分ほどで完了します。送信後、詳細レポート（PDF）のダウンロードURLをメールでもお送りします。
      </p>

      {/* 結果ID（自動復元） */}
      <div className="mt-3 rounded-lg border px-4 py-2 text-xs text-muted-foreground">
        結果ID（rid）：<code>{resultId || '（自動付与）'}</code>
      </div>

      <form onSubmit={onSubmit} className="mt-6 space-y-8">
        {/* hidden（保険：両方入れる） */}
        <input type="hidden" name="rid" value={resultId} />
        <input type="hidden" name="resultId" value={resultId} />
        <input type="hidden" name="assigneePref" value={consultant} />
        <input type="hidden" name="note" value="" />

        {/* ご相談トピック（必須） */}
        <section>
          <h2 className="font-semibold mb-2">
            ご相談トピック <span className="text-red-600 text-xs">（必須・複数選択可）</span>
          </h2>
          <div className="grid sm:grid-cols-2 gap-2">
            {TOPICS.map((t) => (
              <label key={t.key} className="flex items-start gap-2 rounded-md border px-3 py-2">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={topics.includes(t.key)}
                  onChange={() => toggleTopic(t.key)}
                />
                <span className="text-sm">{t.label}</span>
              </label>
            ))}
          </div>
          <div className="mt-2">
            <Label htmlFor="topic-other" className="text-xs">
              「その他」を選んだ方は具体的にご記入ください
            </Label>
            <Input
              id="topic-other"
              value={topicOther}
              onChange={(e) => setTopicOther(e.target.value)}
              placeholder="例）評価面談の設計 など"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            ※ いずれか一つ以上の選択、または「その他」の記入が必要です。
          </p>
        </section>

        {/* ご連絡先（必須） */}
        <section>
          <h2 className="font-semibold mb-2">ご連絡先</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="name">
                お名前 <span className="text-red-600">*</span>
              </Label>
              <Input
                id="name"
                name="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="例）山田 太郎"
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="email">
                メールアドレス <span className="text-red-600">*</span>
              </Label>
              <Input
                id="email"
                name="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
              />
            </div>
          </div>
        </section>

        {/* 到達したい状態（任意） */}
        <section>
          <h2 className="font-semibold mb-2">到達したい状態（任意）</h2>
          <div className="grid sm:grid-cols-2 gap-2">
            {GOAL_CHOICES.map((v) => (
              <label key={v} className="flex items-start gap-2 rounded-md border px-3 py-2">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={goalSel.includes(v)}
                  onChange={() => setGoalSel((p) => toggleArr(p, v))}
                />
                <span className="text-sm">{v}</span>
              </label>
            ))}
          </div>
          <Textarea
            className="mt-2"
            rows={3}
            placeholder="自由記入（任意）"
            value={goalFree}
            onChange={(e) => setGoalFree(e.target.value)}
          />
        </section>

        {/* いまのボトルネック・課題（任意） */}
        <section>
          <h2 className="font-semibold mb-2">いまのボトルネック・課題（任意）</h2>
          <div className="grid sm:grid-cols-2 gap-2">
            {BOTTLENECK_CHOICES.map((v) => (
              <label key={v} className="flex items-start gap-2 rounded-md border px-3 py-2">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={bottleSel.includes(v)}
                  onChange={() => setBottleSel((p) => toggleArr(p, v))}
                />
                <span className="text-sm">{v}</span>
              </label>
            ))}
          </div>
          <Textarea
            className="mt-2"
            rows={3}
            placeholder="自由記入（任意）"
            value={bottleFree}
            onChange={(e) => setBottleFree(e.target.value)}
          />
        </section>

        {/* 優先順位付けしたいテーマ（任意） */}
        <section>
          <h2 className="font-semibold mb-2">優先順位付けしたいテーマ（任意）</h2>
          <div className="grid sm:grid-cols-2 gap-2">
            {PRIORITY_CHOICES.map((v) => (
              <label key={v} className="flex items-start gap-2 rounded-md border px-3 py-2">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={prioritySel.includes(v)}
                  onChange={() => setPrioritySel((p) => toggleArr(p, v))}
                />
                <span className="text-sm">{v}</span>
              </label>
            ))}
          </div>
          <Textarea
            className="mt-2"
            rows={3}
            placeholder="自由記入（任意）"
            value={priorityFree}
            onChange={(e) => setPriorityFree(e.target.value)}
          />
        </section>

        {/* 希望スタイル（任意） */}
        <section>
          <h2 className="font-semibold mb-2">希望スタイル（任意）</h2>
          <div className="grid sm:grid-cols-2 gap-2">
            {STYLE_OPTIONS.map((o) => (
              <label key={o.key} className="flex items-start gap-2 rounded-md border px-3 py-2">
                <input
                  type="radio"
                  name="style"
                  className="mt-1"
                  checked={style === o.key}
                  onChange={() => setStyle(o.key)}
                  value={o.key}
                />
                <span className="text-sm">{o.label}</span>
              </label>
            ))}
          </div>
        </section>

        {/* 担当の希望（任意） */}
        <section>
          <h2 className="font-semibold mb-3">担当の希望（任意）</h2>
          <ConsultantPicker
            value={consultant === 'either' ? 'auto' : consultant}
            onChange={(v) => setConsultant(v === 'auto' ? 'either' : v)}
            showAuto
            autoLabel="どちらでもOK（空き枠優先で調整）"
          />
        </section>

        <div className="flex items-center gap-3">
          <Button type="submit" disabled={!canSubmit}>
            申請を送信する
          </Button>
          {!canSubmit && (
            <p className="text-xs text-muted-foreground">
              お名前・メール、そして「ご相談トピック」をご入力ください。
            </p>
          )}
        </div>
      </form>

      {/* ===== フッター：IOTロゴ＋著作権表示 ===== */}
      <footer className="mt-12 border-t pt-6 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted-foreground">
        <img
          src="/images/logo.png"
          alt="IOT ロゴ"
          className="h-7 w-auto opacity-90"
          onError={(e) => { (e.currentTarget as HTMLImageElement).style.display = 'none'; }}
        />
        <span>© 2025 一般社団法人 企業の未来づくり研究所</span>
      </footer>
    </div>
  );
}
