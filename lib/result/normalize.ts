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
  org_inhibition: 'orgDrag',           // ← 追加（アンダースコア英語）
  '組織進化阻害': 'orgDrag',
  '組織の足かせ': 'orgDrag',

  // commGap
  commgap: 'commGap',
  comm_gap: 'commGap',                 // ← 追加
  communication_gap: 'commGap',        // ← 追加（別名）
  'コミュ力': 'commGap',
  'コミュニケーション': 'commGap',
  'コミュ力誤差': 'commGap',

  // updatePower
  updatepower: 'updatePower',
  update_ability: 'updatePower',       // ← 追加
  update: 'updatePower',               // ← 追加（短縮）
  'アップデート力': 'updatePower',
  '更新力': 'updatePower',
  '変化対応力': 'updatePower',

  // genGap
  gengap: 'genGap',
  gen_gap: 'genGap',                   // ← 追加
  generation_gap: 'genGap',            // ← 追加
  'ジェネギャップ': 'genGap',
  'ジェネギャップ感覚': 'genGap',
  '世代間ギャップ': 'genGap',

  // harassmentRisk
  harassmentrisk: 'harassmentRisk',
  harassment_risk: 'harassmentRisk',   // ← 追加
  harassment: 'harassmentRisk',        // ← 追加（短縮）
  'ハラスメント傾向': 'harassmentRisk',
  '無自覚ハラスメント傾向': 'harassmentRisk',
};

/** 値の取り出し（{score: n} のような入れ子も吸収） */
function pickNumber(val: unknown): number {
  if (typeof val === 'number') return val;
  if (typeof val === 'string' && val.trim() !== '') return Number(val);
  if (val && typeof val === 'object') {
    // score / value / val のような一般的プロパティを拾う
    const obj = val as Record<string, unknown>;
    for (const k of ['score', 'value', 'val']) {
      const v = obj[k];
      if (typeof v === 'number') return v;
      if (typeof v === 'string' && v.trim() !== '') return Number(v);
    }
  }
  return NaN;
}

/** 任意形（CategoryScores相当）→ 固定6カテゴリ配列へ */
export function normalizeToCatArray(
  scores: Record<string, unknown> | null | undefined
): Array<{ key: CatKey; label: string; score: number }> {
  const dict: Partial<Record<CatKey, number>> = {};

  if (scores && typeof scores === 'object') {
    for (const [rawK, val] of Object.entries(scores)) {
      const k0 = String(rawK ?? '').trim();
      const norm = k0.replace(/[\s_]/g, '').toLowerCase();  // スペース/アンダースコア無視で照合
      const key = (ALIASES[k0] || ALIASES[norm]) as CatKey | undefined;
      if (key) {
        const num = pickNumber(val);
        dict[key] = clamp03(num);
      }
    }
  }

  return ORDER.map((o) => ({
    key: o.key,
    label: o.label,
    score: clamp03(dict[o.key]),
  }));
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

/** 絵文字つきの短い評価ラベル（※ 元の閾値を厳守） */
export function getEmojiLabel(score: number): string {
  if (score >= 2.5) return '😄 良好';
  if (score >= 1.5) return '😐 注意';
  if (score >= 1.0) return '😰 ややリスク';
  return '😱 重大リスク';
}
