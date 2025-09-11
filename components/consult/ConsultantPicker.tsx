// components/consult/ConsultantPicker.tsx
'use client';

import Image from 'next/image';
import { useId } from 'react';

type ConsultantKey = 'ishijima' | 'morigami';

export type Consultant = {
  key: ConsultantKey;
  name: string;
  title: string;
  bio: string;
  tags: string[];
  credentials: string[];
  photo: string; // /public 配下
};

export const CONSULTANTS: Record<ConsultantKey, Consultant> = {
  ishijima: {
    key: 'ishijima',
    name: '石島 幸子',
    title: 'エグゼクティブコーチ、対話型組織開発ファシリテーター',
    bio: '“誰もが納得する合意形成”の手法で社員の主体性を引き出し実行を加速。コーチング×会議設計×戦略構築が得意。',
    tags: ['1on1', '会議設計', '意思決定', 'モチベーション'],
    credentials: ['コーチング関連資格', '心理関連資格', 'MindMap®インストラクター等、多数'],
    photo: '/images/consultants/ishijima.png',
  },
  morigami: {
    key: 'morigami',
    name: '森上 ヒロシ',
    title: '組織心理コンサルタント、秒速経営インストーラー',
    bio: '約500社の職場改善、のべ14万人の職場診断に関与。幹部人材育成、組織のエンゲージメント向上等が得意。。',
    tags: ['構造設計', '定着支援', 'エンゲージメント', 'キャリア支援'],
    credentials: ['国家資格キャリアコンサルタント', '他、キャリア関連資格を複数所有'],
    photo: '/images/consultants/morigami.png',
  },
};

type Props = {
  value: ConsultantKey | 'auto';
  onChange: (v: ConsultantKey | 'auto') => void;
  showAuto?: boolean;
  /** 「どちらでもOK」の表示文言をカスタムしたい時だけ渡す */
  autoLabel?: string;
};

export default function ConsultantPicker({
  value,
  onChange,
  showAuto = true,
  autoLabel,
}: Props) {
  const autoId = useId();

  return (
    <div className="space-y-3">
      <label className="block text-sm font-medium">担当の希望</label>

      {showAuto && (
        <label
          htmlFor={autoId}
          className={`relative block border rounded-2xl p-3 cursor-pointer
            ${value === 'auto'
              ? 'ring-2 ring-indigo-500 border-indigo-500 bg-indigo-50'
              : 'hover:bg-slate-50'}`}
        >
          {/* 見た目用チェック */}
          <span
            className={`absolute -top-2 -left-2 h-6 w-6 rounded-full border bg-white flex items-center justify-center text-[10px]
              ${value === 'auto'
                ? 'border-indigo-500 bg-indigo-600 text-white'
                : 'border-slate-300 text-transparent'}`}
          >
            ✓
          </span>
          <input
            id={autoId}
            type="radio"
            name="assignee"
            value="auto"
            checked={value === 'auto'}
            onChange={() => onChange('auto')}
            className="sr-only"
          />
          <div className="font-semibold">
            {autoLabel ?? 'どちらでもOK（空き枠優先で調整）'}
          </div>
          <div className="text-xs text-slate-500">
            内容に応じて最適な担当に自動で振り分けます
          </div>
        </label>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        {(['ishijima', 'morigami'] as ConsultantKey[]).map((k) => {
          const c = CONSULTANTS[k];
          const id = useId();
          const active = value === c.key;

          return (
            <label
              key={c.key}
              htmlFor={id}
              className={`relative grid grid-cols-[96px_1fr] gap-4 border rounded-2xl p-4 cursor-pointer
                ${active
                  ? 'ring-2 ring-indigo-500 border-indigo-500 bg-indigo-50'
                  : 'hover:bg-slate-50'}`}
            >
              {/* 見た目用チェック */}
              <span
                className={`absolute -top-2 -left-2 h-6 w-6 rounded-full border bg-white flex items-center justify-center text-[10px]
                  ${active
                    ? 'border-indigo-500 bg-indigo-600 text-white'
                    : 'border-slate-300 text-transparent'}`}
              >
                ✓
              </span>

              <input
                id={id}
                type="radio"
                name="assignee"
                value={c.key}
                checked={active}
                onChange={() => onChange(c.key)}
                className="sr-only"
              />

              {/* 画像はトリミングせず収める */}
              <div className="relative h-24 w-24 overflow-hidden rounded-xl border bg-white">
                <Image
                  src={c.photo}
                  alt={c.name}
                  fill
                  sizes="96px"
                  className="object-contain p-1"
                />
              </div>

              <div>
                <div className="font-semibold leading-5">{c.name}</div>
                <div className="text-xs text-slate-500">{c.title}</div>
                <div className="text-sm mt-1">{c.bio}</div>

                <div className="flex flex-wrap gap-1 mt-2">
                  {c.tags.map((t) => (
                    <span
                      key={t}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-slate-100 border"
                    >
                      {t}
                    </span>
                  ))}
                </div>

                <div className="text-[10px] text-slate-500 mt-1">
                  資格：{c.credentials.join(' / ')}
                </div>
              </div>
            </label>
          );
        })}
      </div>
    </div>
  );
}
