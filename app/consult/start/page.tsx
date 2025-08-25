// app/consult/start/page.tsx
'use client';

import { useMemo, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import ConsultantPicker from '@/components/consult/ConsultantPicker';

type TopicKey =
  | 'meeting'      // 会議設計・合意形成
  | 'delegation'   // 権限委譲・リーダー育成
  | 'relations'    // 上下・部門の関係性
  | 'engagement'   // エンゲージメント
  | 'career'       // キャリアサポート
  | 'execCoaching' // エグゼクティブコーチング
  | 'brain'        // 思考技術・創発風土
  | 'culture'      // 風土改善
  | 'vision'       // 理念・ビジョン
  | 'other';       // その他（自由記入）

const TOPICS: { key: TopicKey; label: string }[] = [
  { key: 'meeting',      label: '会議設計・合意形成（会議で決めきる）' },
  { key: 'delegation',   label: '権限委譲・リーダー育成' },
  { key: 'relations',    label: '上司‐部下／部門間の関係性改善' },
  { key: 'engagement',   label: '社員のエンゲージメント向上' },
  { key: 'career',       label: '社員のキャリアサポート' },
  { key: 'execCoaching', label: 'エグゼクティブコーチング（Topの思考整理）' },
  { key: 'brain',        label: '社員の脳力向上（思考技術、創発風土の醸成）' },
  { key: 'culture',      label: '風土改善' },
  { key: 'vision',       label: '理念・ビジョンの構築／浸透' },
  { key: 'other',        label: 'その他（自由記入）' },
];

const GOAL_CHOICES = [
  '社員のモチベーションや主体性のＵＰ',
  '互いに高めあう社風の醸成',
  '昭和型リーダーシップからの脱却',
  '部門を超えた連携力のUP',
  'DXを加速し、業務効率UP',
  '離職率の低下',
];

const BOTTLENECK_CHOICES = [
  'トップ営業に依存しており新規開拓が困難',
  '後継者／右腕が育たない',
  '受け身型の社員が多い',
  '改革はしたいが、社内に抵抗勢力がある',
  '古参社員と若手のジェネレーションギャップ',
  '決定しても実行が進まない',
];

const PRIORITY_CHOICES = [
  '社員同士の関係性・風土の改善',
  '理念やビジョンの構築／浸透',
  '権限移譲・会議設計',
  '社員の意識改革',
  '後継者やリーダーの育成',
  '社員のエンゲージメントの強化',
];

type StyleKey = 'deep' | 'speed'; // 並び順を「深掘り→スピード」に
const STYLE_OPTIONS: { key: StyleKey; label: string }[] = [
  { key: 'deep',  label: '深掘り重視：現状把握〜優先順位までしっかり' },
  { key: 'speed', label: 'スピード重視：まずは仮説とヒアリングで次の一手' },
];

type ConsultantKey = 'ishijima' | 'morigami' | 'either';

export default function ConsultStartPage() {
  const sp = useSearchParams();
  const token = sp.get('token') || '';
  const resultId = sp.get('resultId') || '';

  // 連絡先（必須）
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');

  // ご相談トピック（必須）
  const [topics, setTopics] = useState<TopicKey[]>([]);
  const [topicOther, setTopicOther] = useState('');

  // 任意：到達状態・課題・優先テーマ（選択＋自由記入）
  const [goalSel, setGoalSel] = useState<string[]>([]);
  const [goalFree, setGoalFree] = useState('');

  const [bottleSel, setBottleSel] = useState<string[]>([]);
  const [bottleFree, setBottleFree] = useState('');

  const [prioritySel, setPrioritySel] = useState<string[]>([]);
  const [priorityFree, setPriorityFree] = useState('');

  // 希望スタイル（任意）
  const [style, setStyle] = useState<StyleKey | null>(null);

  // 担当の希望（任意）: 'either' を UI の 'auto' と相互変換
  const [consultant, setConsultant] = useState<ConsultantKey>('either');

  const canSubmit = useMemo(() => {
    const emailOk = /\S+@\S+\.\S+/.test(email.trim());
    const nameOk = name.trim().length > 0;
    const topicsOk = topics.length > 0 || topicOther.trim().length > 0;
    return emailOk && nameOk && topicsOk;
  }, [email, name, topics, topicOther]);

  const toggleArr = (arr: string[], v: string) =>
    arr.includes(v) ? arr.filter(x => x !== v) : [...arr, v];

  const toggleTopic = (k: TopicKey) =>
    setTopics(prev => prev.includes(k) ? prev.filter(x => x !== k) : [...prev, k]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!canSubmit) return;

    const payload = {
      token,
      resultId,
      contact: { name: name.trim(), email: email.trim() },
      topics: { selected: topics, other: topicOther.trim() || null },
      goals: { selected: goalSel, free: goalFree.trim() || null },
      bottlenecks: { selected: bottleSel, free: bottleFree.trim() || null },
      priorities: { selected: prioritySel, free: priorityFree.trim() || null },
      style: style || null,
      consultant, // 'ishijima' | 'morigami' | 'either'
    };

    try {
      const res = await fetch('/api/consult/booking', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const j = await res.json().catch(() => ({}));
      if (!res.ok || j?.ok === false) throw new Error(j?.error || '送信に失敗しました');
      alert('送信しました。折り返しご連絡いたします。');
    } catch (err) {
      console.error(err);
      alert('送信に失敗しました。お手数ですが後ほどお試しください。');
    }
  }

  return (
    <div className="mx-auto max-w-3xl px-4 sm:px-6 py-8">
      <h1 className="text-2xl font-bold">【詳細レポート特典】無料相談のお申込み</h1>
      <p className="text-sm text-muted-foreground mt-1">
        入力は1分ほどで完了します。送信後、詳細レポート（PDF）のダウンロードURLをメールでもお送りします。
      </p>

      <div className="mt-3 rounded-lg border px-4 py-2 text-xs text-muted-foreground">
        結果ID：<code>{resultId || '（自動付与）'}</code>
      </div>

      <form onSubmit={onSubmit} className="mt-6 space-y-8">
        {/* ご相談トピック（必須） */}
        <section>
          <h2 className="font-semibold mb-2">
            ご相談トピック <span className="text-red-600 text-xs">（必須・複数選択可）</span>
          </h2>
          <div className="grid sm:grid-cols-2 gap-2">
            {TOPICS.map(t => (
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
            <Label htmlFor="topic-other" className="text-xs">「その他」を選んだ方は具体的にご記入ください</Label>
            <Input
              id="topic-other"
              value={topicOther}
              onChange={e => setTopicOther(e.target.value)}
              placeholder="例）評価面談の設計　など"
            />
          </div>
          <p className="text-xs text-muted-foreground mt-1">
            ※ いずれか一つ以上の選択、または「その他」の記入が必要です。
          </p>
        </section>

        {/* ご連絡先（両方必須） */}
        <section>
          <h2 className="font-semibold mb-2">ご連絡先</h2>
          <div className="grid sm:grid-cols-2 gap-4">
            <div className="space-y-1">
              <Label htmlFor="name">お名前 <span className="text-red-600">*</span></Label>
              <Input
                id="name"
                placeholder="例）山田 太郎"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="email">メールアドレス <span className="text-red-600">*</span></Label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          </div>
        </section>

        {/* 到達したい状態（任意） */}
        <section>
          <h2 className="font-semibold mb-2">到達したい状態（任意）</h2>
          <div className="grid sm:grid-cols-2 gap-2">
            {GOAL_CHOICES.map(v => (
              <label key={v} className="flex items-start gap-2 rounded-md border px-3 py-2">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={goalSel.includes(v)}
                  onChange={() => setGoalSel(prev => toggleArr(prev, v))}
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
            onChange={e => setGoalFree(e.target.value)}
          />
        </section>

        {/* いまのボトルネック・課題（任意） */}
        <section>
          <h2 className="font-semibold mb-2">いまのボトルネック・課題（任意）</h2>
          <div className="grid sm:grid-cols-2 gap-2">
            {BOTTLENECK_CHOICES.map(v => (
              <label key={v} className="flex items-start gap-2 rounded-md border px-3 py-2">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={bottleSel.includes(v)}
                  onChange={() => setBottleSel(prev => toggleArr(prev, v))}
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
            onChange={e => setBottleFree(e.target.value)}
          />
        </section>

        {/* 優先順位付けしたいテーマ（任意） */}
        <section>
          <h2 className="font-semibold mb-2">優先順位付けしたいテーマ（任意）</h2>
          <div className="grid sm:grid-cols-2 gap-2">
            {PRIORITY_CHOICES.map(v => (
              <label key={v} className="flex items-start gap-2 rounded-md border px-3 py-2">
                <input
                  type="checkbox"
                  className="mt-1"
                  checked={prioritySel.includes(v)}
                  onChange={() => setPrioritySel(prev => toggleArr(prev, v))}
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
            onChange={e => setPriorityFree(e.target.value)}
          />
        </section>

        {/* 希望スタイル（任意） */}
        <section>
          <h2 className="font-semibold mb-2">希望スタイル（任意）</h2>
          <div className="grid sm:grid-cols-2 gap-2">
            {STYLE_OPTIONS.map(o => (
              <label key={o.key} className="flex items-start gap-2 rounded-md border px-3 py-2">
                <input
                  type="radio"
                  name="style"
                  className="mt-1"
                  checked={style === o.key}
                  onChange={() => setStyle(o.key)}
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
          <Button type="submit" disabled={!canSubmit}>申請を送信する</Button>
          {!canSubmit && (
            <p className="text-xs text-muted-foreground">
              お名前・メール、そして「ご相談トピック」をご入力ください。
            </p>
          )}
        </div>
      </form>
    </div>
  );
}
