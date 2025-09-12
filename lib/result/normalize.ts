// /lib/result/normalize.ts
import { KEY_TO_JA } from '@/lib/samuraiTypeMap';
import { ORDER, clamp03 } from '@/lib/scoreSnapshot';
import type { CatKey } from '@/lib/scoreSnapshot';

/** エイリアス（英語/日本語/表記ゆれ）→ 正式キー */
const ALIASES: Record<string, CatKey> = {
  // delegation
  delegation: 'delegation',
  '権限委譲': 'delegation',
  '権限委譲・構造': 'delegation',
  '権限委譲・構造資産化': 'delegation',
  '権限委譲・構造健全度': 'delegation',
  '構造健全度': 'delegation',

  // orgDrag
  orgdrag: 'orgDrag',
  org_inhibition: 'orgDrag',
  '組織進化阻害': 'orgDrag',
  '組織の足かせ': 'orgDrag',

  // commGap
  commgap: 'commGap',
  'コミュ力': 'commGap',
  'コミュニケーション': 'commGap',
  'コミュ力誤差': 'commGap',

  // updatePower
  updatepower: 'updatePower',
  update: 'updatePower',
  update_ability: 'updatePower',
  'アップデート力': 'updatePower',
  '更新力': 'updatePower',
  '変化対応力': 'updatePower',

  // genGap
  gengap: 'genGap',
  generation_gap: 'genGap',
  'ジェネギャップ': 'genGap',
  'ジェネギャップ感覚': 'genGap',
  '世代間ギャップ': 'genGap',

  // harassmentRisk
  harassmentrisk: 'harassmentRisk',
  harassment_risk: 'harassmentRisk',
  harassment: 'harassmentRisk',
  'ハラスメント傾向': 'harassmentRisk',
  '無自覚ハラスメント傾向': 'harassmentRisk',
};

// 日本語ラベル逆引き用
const JP_BY_KEY: Record<CatKey, string> =
  Object.fromEntries(ORDER.map(o => [o.key, o.label])) as Record<CatKey, string>;

const norm = (s: string) => s.replace(/\s+/g, '').toLowerCase();

function asKey(raw: unknown): CatKey | undefined {
  if (!raw) return undefined;
  const s = String(raw).trim();
  const n = norm(s);
  // 1) 直接/正規化エイリアス
  const byAlias = (ALIASES[s] ?? ALIASES[n]) as CatKey | undefined;
  if (byAlias) return byAlias;
  // 2) 日本語ラベル完全一致（空白無視）
  const hit = (Object.entries(JP_BY_KEY) as Array<[CatKey, string]>)
    .find(([, ja]) => norm(ja) === norm(s));
  return hit?.[0];
}

function pickNumber(v: unknown): number {
  if (typeof v === 'number') return v;
  if (typeof v === 'string') {
    const n = Number(v.trim());
    return Number.isFinite(n) ? n : NaN;
  }
  if (v && typeof v === 'object') {
    const o = v as any;
    for (const k of ['score', 'value', 'val', 's']) {
      const n = pickNumber(o?.[k]);
      if (Number.isFinite(n)) return n;
    }
  }
  return NaN;
}

/** 任意形（Record でも Array でも OK）→ 固定6カテゴリ配列へ */
export function normalizeToCatArray(
  input: unknown
): Array<{ key: CatKey; label: string; score: number }> {
  const bucket = new Map<CatKey, number>();

  // A) 配列 [{ key/label, score }] 形
  if (Array.isArray(input)) {
    for (const it of input) {
      const k = asKey((it as any)?.key ?? (it as any)?.label);
      const v = pickNumber((it as any)?.score ?? (it as any)?.value ?? (it as any)?.val);
      if (k && Number.isFinite(v)) bucket.set(k, clamp03(v));
    }
  }
  // B) オブジェクト { key: number | { score: n } }
  else if (input && typeof input === 'object') {
    for (const [rawK, v] of Object.entries(input as Record<string, unknown>)) {
      const k = asKey(rawK);
      const n = pickNumber(v);
      if (k && Number.isFinite(n)) bucket.set(k, clamp03(n));
    }
  }

  // 常に 6 本返す（欠けは 0 で補完）
  return ORDER.map(o => ({ key: o.key, label: o.label, score: clamp03(bucket.get(o.key) ?? 0) }));
}

/** 武将タイプの表記ゆれ吸収（key/日本語/未知に対応） */
export function resolveSamuraiType(
  raw: string | null | undefined
): { key?: string; ja?: string; display: string } {
  const v = (raw ?? '').toString().trim();
  if (!v) return { display: '' };

  if (v in KEY_TO_JA) {
    const ja = (KEY_TO_JA as any)[v] as string;
    return { key: v, ja, display: ja };
  }
  const n = v.replace(/\s+/g, '').replace(/型$/, '');
  for (const [k, name] of Object.entries(KEY_TO_JA)) {
    if (String(name).replace(/\s+/g, '').replace(/型$/, '') === n) {
      return { key: k, ja: String(name), display: String(name) };
    }
  }
  return { display: v };
}

/** 絵文字つきの短い評価ラベル（元の閾値を維持） */
export function getEmojiLabel(score: number): string {
  if (score >= 2.5) return '😄 良好';
  if (score >= 1.5) return '😐 注意';
  if (score >= 1.0) return '😰 ややリスク';
  return '😱 重大リスク';
}
