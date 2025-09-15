// /types/diagnosis.ts
// 武将タイプ診断：型定義（Q16対応 / 企業規模・年齢層ユーティリティも維持）

/* ========== 年齢層・企業規模 ========== */
export type AgeGroup =
  | '40代'
  | '50代'
  | '60代'
  | '70代以上'
  | '不明';

export type CompanySizeBucket =
  | '1-10'
  | '11-50'
  | '51-100'
  | '101-300'
  | '301-500'
  | '501-1000'
  | '1001+'
  | 'unknown';

export function normalizeCompanySize(v: unknown): CompanySizeBucket {
  const s = String(v ?? '').trim().replace(/\s/g, '');
  if (!s) return 'unknown';
  // よくある表記を網羅
  if (/^(1|１)[-~〜～]?(10|１０)名?$|^1[-]10$|^1[〜～]10$/.test(s)) return '1-10';
  if (/^(11|１１)[-~〜～]?(50|５０)名?$|^11[-]50$|^11[〜～]50$/.test(s)) return '11-50';
  if (/^(51|５１)[-~〜～]?(100|１００)名?$|^51[-]100$|^51[〜～]100$/.test(s)) return '51-100';
  if (/^(101|１０１)[-~〜～]?(300|３００)名?$|^101[-]300$|^101[〜～]300$/.test(s)) return '101-300';
  if (/^(301|３０１)[-~〜～]?(500|５００)名?$|^301[-]500$|^301[〜～]500$/.test(s)) return '301-500';
  if (/^(501|５０１)[-~〜～]?(1000|１０００)名?$|^501[-]1000$|^501[〜～]1000$/.test(s)) return '501-1000';
  if (/^(1001|１００１)\+?名?$|^1001\+$/.test(s)) return '1001+';
  return 'unknown';
}

export function isSMB(size: CompanySizeBucket | string): boolean {
  const b = normalizeCompanySize(size);
  return b === '1-10' || b === '11-50';
}
export function isMid(size: CompanySizeBucket | string): boolean {
  const b = normalizeCompanySize(size);
  return b === '51-100' || b === '101-300';
}
export function isEnterprise(size: CompanySizeBucket | string): boolean {
  const b = normalizeCompanySize(size);
  return b === '301-500' || b === '501-1000' || b === '1001+';
}

/* ========== 設問 / カテゴリ ========== */
/** 設問ID（固定16問） */
export type QuestionId =
  | 'Q1'  | 'Q2'  | 'Q3'  | 'Q4'
  | 'Q5'  | 'Q6'  | 'Q7'  | 'Q8'
  | 'Q9'  | 'Q10' | 'Q11' | 'Q12'
  | 'Q13' | 'Q14' | 'Q15' | 'Q16';

/** 利便用：全QID配列 */
export const ALL_QUESTION_IDS: QuestionId[] = [
  'Q1','Q2','Q3','Q4','Q5','Q6','Q7','Q8',
  'Q9','Q10','Q11','Q12','Q13','Q14','Q15','Q16',
];

/** スコアカテゴリの内部キー */
export type CategoryKey =
  | 'delegation'            // 権限委譲・構造健全度
  | 'orgDrag'               // 組織進化阻害
  | 'commGap'               // コミュ力誤差
  | 'updatePower'           // アップデート力
  | 'genGap'                // ジェネギャップ感覚
  | 'harassmentAwareness';  // 無自覚ハラスメント傾向（正式名）

/* ========== 武将タイプ ========== */
export type SamuraiType =
  | '真田幸村型'
  | '今川義元型'
  | '斎藤道三型'
  | '織田信長型'
  | '豊臣秀吉型'
  | '徳川家康型'
  | '上杉謙信型';

/* ========== 採点IO ========== */
/** Q→選択肢テキストの写し（採点入力） */
export type ScorePattern = Record<QuestionId, string>;

/** 生スコア（カテゴリ合算前） */
export type RawCategoryScores = Record<CategoryKey, number>;

/** 0〜3の正規化スコア（互換用の optional を付与） */
export type NormalizedCategoryScores = Record<CategoryKey, number> & {
  /** 旧コンポーネント互換。実体は harassmentAwareness と同値扱いでOK */
  harassmentRisk?: number;
};

/** 結果APIなどで使うまとめ型（必要に応じて拡張可） */
export type DiagnosisPayload = {
  id: string; // 事前に生成したUUID
  ageGroup: AgeGroup;
  companySize: CompanySizeBucket | string; // フォームの生値でもOK
  scorePattern: ScorePattern;              // 回答（選択肢テキストのJSON）
  rawScores?: RawCategoryScores;
  normalizedScores?: NormalizedCategoryScores;
  samuraiType?: SamuraiType;
  createdAt?: string;
};
