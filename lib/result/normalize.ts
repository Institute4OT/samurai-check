// lib/result/normalize.ts
import { KEY_TO_JA } from '@/lib/samuraiTypeMap';
import { ORDER, clamp03 } from '@/lib/scoreSnapshot';
import type { CatKey } from '@/lib/scoreSnapshot';

/** ラベル表記ゆれ → 正式キーへ */
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
  '組織進化阻害': 'orgDrag',
  '組織の足かせ': 'orgDrag',
  // commGap
  commgap: 'commGap',
  'コミュ力': 'commGap',
  'コミュニケーション': 'commGap',
  'コミュ力誤差': 'commGap',
  // updatePower
  updatepower: 'updatePower',
  'アップデート力': 'updatePower',
  '更新力': 'updatePower',
  '変化対応力': 'updatePower',
  // genGap
  gengap: 'genGap',
  'ジェネギャップ': 'genGap',
  'ジェネギャップ感覚': 'genGap',
  '世代間ギャップ': 'genGap',
  // harassmentRisk
  harassmentrisk: 'harassmentRisk',
  'ハラスメント傾向': 'harassmentRisk',
  '無自覚ハラスメント傾向': 'harassmentRisk',
};

/** 任意形（CategoryScores相当）→ 固定6カテゴリ配列へ */
export function normalizeToCatArray(
  scores: Record<string, unknown> | null | undefined
): Array<{ key: CatKey; label: string; score: number }> {
  const dict: Partial<Record<CatKey, number>> = {};

  if (scores && typeof scores === 'object') {
    for (const [rawK, val] of Object.entries(scores)) {
      const k0 = String(rawK ?? '').trim();
      const norm = k0.replace(/[\s_]/g, '').toLowerCase();
      const key = (ALIASES[k0] || ALIASES[norm]) as CatKey | undefined;
      if (key) dict[key] = clamp03(val);
    }
  }
  return ORDER.map(o => ({ key: o.key, label: o.label, score: clamp03(dict[o.key]) }));
}

/** 武将タイプの表記ゆれ吸収（key/日本語/未知に対応） */
export function resolveSamuraiType(
  raw: string | null | undefined
): { key?: string; ja?: string; display: string } {
  const v = (raw ?? '').toString().trim();
  if (!v) return { display: '' };

  // 1) key として一致
  if (v in KEY_TO_JA) {
    const ja = (KEY_TO_JA as any)[v] as string;
    return { key: v, ja, display: ja };
  }
  // 2) 日本語名のゆらぎ（末尾「型」や空白）
  const norm = (s: string) => s.replace(/\s+/g, '').replace(/型$/, '');
  const n = norm(v);
  for (const [k, name] of Object.entries(KEY_TO_JA)) {
    if (norm(String(name)) === n) return { key: k, ja: String(name), display: String(name) };
  }
  // 3) 未知の表記はそのまま表示
  return { display: v };
}

/** 絵文字つきの短い評価ラベル */
export function getEmojiLabel(score: number): string {
  if (score >= 2.5) return '😄 良好';
  if (score >= 1.5) return '😐 注意';
  if (score >= 1.0) return '😰 ややリスク';
  return '😱 重大リスク';
}
