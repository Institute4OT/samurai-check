// /lib/result/normalize.ts
import { KEY_TO_JA } from '@/lib/samuraiTypeMap';
import { ORDER, clamp03 } from '@/lib/scoreSnapshot';
import type { CatKey } from '@/lib/scoreSnapshot';

/** ラベル表記ゆれ → 正式キーへ（英名/和名/略称/アンダースコア等まとめて吸収） */
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
  update_ability: 'updatePower',
  update: 'updatePower',
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

/** いろんな形から「数値」を引っこ抜く（scoreやvalue内包も拾う） */
function pickNumber(val: unknown): number {
  if (typeof val === 'number' && Number.isFinite(val)) return val;
  if (typeof val === 'string' && val.trim() !== '') return Number(val);
  if (val && typeof val === 'object') {
    const obj = val as Record<string, unknown>;
    if ('score' in obj) return pickNumber(obj.score);
    if ('value' in obj) return pickNumber(obj.value);
  }
  return NaN;
}

/** 任意形（Record でも Array でもOK）→ 6カテゴリ配列へ統一 */
export function normalizeToCatArray(
  input: unknown
): Array<{ key: CatKey; label: string; score: number }> {
  const dict: Partial<Record<CatKey, number>> = {};

  const push = (rawKey: unknown, rawVal: unknown) => {
    const k0 = String(rawKey ?? '').trim();
    if (!k0) return;
    const norm = k0.replace(/[\s_-]/g, '').toLowerCase();
    const key = (ALIASES[k0] || ALIASES[norm]) as CatKey | undefined;
    if (!key) return;
    const n = pickNumber(rawVal);
    if (Number.isFinite(n)) dict[key] = clamp03(n);
  };

  // 1) 配列 [{ key,label,score }] もしくは [{ label, score }]
  if (Array.isArray(input)) {
    for (const row of input as any[]) {
      if (!row || typeof row !== 'object') continue;
      const r = row as any;
      push(r.key ?? r.label, r.score ?? r.value);
    }
  }
  // 2) オブジェクト { "権限委譲・構造健全度": 2.1, ... }
  else if (input && typeof input === 'object') {
    for (const [rawK, val] of Object.entries(input as Record<string, unknown>)) {
      push(rawK, val);
    }
  }

  // 3) 出力は順序固定の 6 要素
  return ORDER.map(({ key, label }) => ({ key, label, score: clamp03((dict as any)[key]) }));
}

/** 武将タイプ（key/日本語/未知）を表示名に整える */
export function resolveSamuraiType(
  raw: string | null | undefined
): { key?: string; ja?: string; display: string } {
  const v = (raw ?? '').toString().trim();
  if (!v) return { display: '' };

  if (v in KEY_TO_JA) {
    const ja = (KEY_TO_JA as any)[v] as string;
    return { key: v, ja, display: ja };
  }
  const norm = (s: string) => s.replace(/\s+/g, '').replace(/型$/, '');
  const n = norm(v);
  for (const [k, name] of Object.entries(KEY_TO_JA)) {
    if (norm(String(name)) === n) return { key: k, ja: String(name), display: String(name) };
  }
  return { display: v };
}

/** 絵文字つきの短い評価ラベル（元の閾値のまま） */
export function getEmojiLabel(score: number): string {
  if (score >= 2.5) return '😄 良好';
  if (score >= 1.5) return '😐 注意';
  if (score >= 1.0) return '😰 ややリスク';
  return '😱 重大リスク';
}
