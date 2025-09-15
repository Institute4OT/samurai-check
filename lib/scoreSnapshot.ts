// lib/scoreSnapshot.ts
// スコアの正規化と固定順、既存行からの復元をここで一元化
export type CatKey =
  | "delegation" // 権限委譲・構造健全度
  | "orgDrag" // 組織進化阻害
  | "commGap" // コミュ力誤差
  | "updatePower" // アップデート力
  | "genGap" // ジェネギャップ感覚
  | "harassmentRisk"; // 無自覚ハラスメント傾向

export type CatItem = { key: CatKey; label: string; score: number };

export const ORDER: { key: CatKey; label: string }[] = [
  { key: "delegation", label: "権限委譲・構造健全度" },
  { key: "orgDrag", label: "組織進化阻害" },
  { key: "commGap", label: "コミュ力誤差" },
  { key: "updatePower", label: "アップデート力" },
  { key: "genGap", label: "ジェネギャップ感覚" },
  { key: "harassmentRisk", label: "無自覚ハラスメント傾向" },
];

export function clamp03(n: unknown): number {
  const v = typeof n === "number" ? n : Number(n);
  if (Number.isNaN(v)) return 0;
  return Math.max(0, Math.min(3, v));
}

// 既存の数値カラムから JSON を作る（過去データ救済・バックフィル用）
export function fromColumns(row: any): CatItem[] {
  const m: Record<CatKey, number> = {
    delegation: clamp03(row?.score_delegation),
    orgDrag: clamp03(row?.score_orgDrag),
    commGap: clamp03(row?.score_commGap),
    updatePower: clamp03(row?.score_updatePower),
    genGap: clamp03(row?.score_genGap),
    harassmentRisk: clamp03(row?.score_harassmentRisk),
  };
  return ORDER.map(({ key, label }) => ({ key, label, score: m[key] }));
}

// DB行からレポート用スナップショットを取り出す（最優先：categories_json）
export function readSnapshot(row: any): {
  categories: CatItem[];
  samuraiTypeKey?: string;
  samuraiTypeJa?: string;
} {
  const cats: CatItem[] = Array.isArray(row?.categories_json)
    ? normalizeCats(row.categories_json)
    : fromColumns(row);

  return {
    categories: cats,
    samuraiTypeKey: row?.samurai_type_key ?? undefined,
    samuraiTypeJa:
      row?.samurai_type_ja ??
      (typeof row?.samurai_type === "string" ? row.samurai_type : undefined),
  };
}

// 外部から入ってきた JSON を安全化（キー欠け・順序乱れを修正）
export function normalizeCats(raw: any[]): CatItem[] {
  const dict: Record<string, number> = {};
  for (const r of raw || []) {
    const k = (r?.key ?? "").toString();
    const s = clamp03(r?.score);
    if (k) dict[k] = s;
  }
  return ORDER.map(({ key, label }) => ({
    key,
    label,
    score: clamp03(dict[key]),
  }));
}
