// /lib/samuraiJudge.ts
// 秒速戦国チェック｜7タイプ判定ロジック（フル機能・型堅牢化）

import type {
  CategoryKey,
  NormalizedCategoryScores,
  SamuraiType,
} from '@/types/diagnosis';
import { ensureHarassmentAliases } from '@/lib/harassmentKey';

/* ============================================================
   型・設定
   ============================================================ */

export type RuleHit =
  | 'SANADA_RULE'
  | 'ODA_RULE'
  | 'TOYOTOMI_RULE'
  | 'TOKUGAWA_RULE'
  | 'DOSAN_RULE'
  | 'IMAGAWA_RULE'
  | 'UESUGI_FALLBACK';

export type JudgeConfig = {
  /** カテゴリごとの重み（合致度スコア式で使用） */
  weights: Record<CategoryKey, number>;
  /** 各ルールのしきい値 */
  thresholds: {
    sanada_update_min: number;
    sanada_delegation_min: number;

    oda_update_min: number;
    oda_comm_max: number;
    oda_gen_max: number;

    toyotomi_update_min: number;
    toyotomi_comm_min: number;

    tokugawa_delegation_min: number;
    tokugawa_org_max: number;

    dosan_org_min: number;

    imagawa_har_min: number;
  };
  /** ルール優先順（ヒットした複数候補があるときに先に当てる） */
  rulePriority: RuleHit[];
  /** タイブレークの総合優先順（カテゴリの重要度順） */
  tieBreakPriority: CategoryKey[];
  /** すべて決まらない時の最終フォールバック */
  defaultFallback: SamuraiType;
};

/** 既定設定（9/9時点の挙動を尊重） */
export const defaultJudgeConfig: JudgeConfig = {
  weights: {
    delegation: 1.0,
    orgDrag: 1.0,
    commGap: 1.0,
    updatePower: 1.0,
    genGap: 1.0,
    harassmentAwareness: 1.0,
  },
  thresholds: {
    sanada_update_min: 2.4,
    sanada_delegation_min: 2.0,

    oda_update_min: 2.2,
    oda_comm_max: 1.2,
    oda_gen_max: 1.4,

    toyotomi_update_min: 1.6,
    toyotomi_comm_min: 1.6,

    tokugawa_delegation_min: 2.2,
    tokugawa_org_max: 1.2,

    dosan_org_min: 2.2,

    imagawa_har_min: 2.0,
  },
  rulePriority: [
    'SANADA_RULE',
    'ODA_RULE',
    'TOYOTOMI_RULE',
    'TOKUGAWA_RULE',
    'DOSAN_RULE',
    'IMAGAWA_RULE',
    'UESUGI_FALLBACK',
  ],
  tieBreakPriority: [
    'updatePower',
    'delegation',
    'orgDrag',
    'commGap',
    'genGap',
    'harassmentAwareness',
  ],
  defaultFallback: '上杉謙信型',
};

/* ============================================================
   util
   ============================================================ */

const clamp03 = (v: number) => Math.max(0, Math.min(3, Number.isFinite(v) ? v : 0));
const w = (v: number, weight: number) => clamp03(v) * weight;

/** 配列 indexOf の安全版（未定義は最下位扱い） */
function safeIdx<T extends string>(arr: readonly T[], key: T | string): number {
  const i = arr.indexOf(key as T);
  return i >= 0 ? i : 999;
}

/* ============================================================
   ルール判定（ヒューリスティック）
   ============================================================ */

type RuleCheck = { hit: boolean; type: SamuraiType; rule: RuleHit };

function checkSanada(s: NormalizedCategoryScores, c: JudgeConfig): RuleCheck {
  const t = c.thresholds;
  return {
    hit: s.updatePower >= t.sanada_update_min && s.delegation >= t.sanada_delegation_min,
    type: '真田幸村型',
    rule: 'SANADA_RULE',
  };
}

function checkOda(s: NormalizedCategoryScores, c: JudgeConfig): RuleCheck {
  const t = c.thresholds;
  return {
    hit: s.updatePower >= t.oda_update_min && s.commGap <= t.oda_comm_max && s.genGap <= t.oda_gen_max,
    type: '織田信長型',
    rule: 'ODA_RULE',
  };
}

function checkToyotomi(s: NormalizedCategoryScores, c: JudgeConfig): RuleCheck {
  const t = c.thresholds;
  return {
    hit: s.updatePower >= t.toyotomi_update_min && s.commGap >= t.toyotomi_comm_min,
    type: '豊臣秀吉型',
    rule: 'TOYOTOMI_RULE',
  };
}

function checkTokugawa(s: NormalizedCategoryScores, c: JudgeConfig): RuleCheck {
  const t = c.thresholds;
  return {
    hit: s.delegation >= t.tokugawa_delegation_min && s.orgDrag <= t.tokugawa_org_max,
    type: '徳川家康型',
    rule: 'TOKUGAWA_RULE',
  };
}

function checkDosan(s: NormalizedCategoryScores, c: JudgeConfig): RuleCheck {
  const t = c.thresholds;
  return {
    hit: s.orgDrag >= t.dosan_org_min,
    type: '斎藤道三型',
    rule: 'DOSAN_RULE',
  };
}

function checkImagawa(s: NormalizedCategoryScores, c: JudgeConfig): RuleCheck {
  const t = c.thresholds;
  return {
    hit: s.harassmentAwareness >= t.imagawa_har_min,
    type: '今川義元型',
    rule: 'IMAGAWA_RULE',
  };
}

/* ============================================================
   合致度スコア（タイブレーク時に比較）
   - 9/9のバランスを参考：強み（updatePower/ delegation）をやや重視、
     リスク側（orgDrag/commGap/genGap/harassmentAwareness）は抑制（小さいほど良い）
   ============================================================ */

export function compatibilityScoreByType(
  s0: NormalizedCategoryScores,
  cfg: JudgeConfig = defaultJudgeConfig,
): Record<SamuraiType, number> {
  const s = {
    delegation: clamp03(s0.delegation),
    orgDrag: clamp03(s0.orgDrag),
    commGap: clamp03(s0.commGap),
    updatePower: clamp03(s0.updatePower),
    genGap: clamp03(s0.genGap),
    harassmentAwareness: clamp03(s0.harassmentAwareness),
  };
  const wgt = cfg.weights;

  const sanada =
    + w(s.updatePower, wgt.updatePower) * 1.2
    + w(s.delegation, wgt.delegation) * 1.0
    - w(s.orgDrag, wgt.orgDrag) * 0.6
    - w(s.harassmentAwareness, wgt.harassmentAwareness) * 0.4;

  const oda =
    + w(s.updatePower, wgt.updatePower) * 1.1
    - w(s.commGap, wgt.commGap) * 0.9
    - w(s.genGap, wgt.genGap) * 0.7;

  const toyotomi =
    + w(s.updatePower, wgt.updatePower) * 0.9
    + w(s.commGap, wgt.commGap) * 0.9;

  const tokugawa =
    + w(s.delegation, wgt.delegation) * 1.0
    - w(s.orgDrag, wgt.orgDrag) * 1.0
    - w(s.harassmentAwareness, wgt.harassmentAwareness) * 0.3;

  const dosan =
    + w(s.orgDrag, wgt.orgDrag) * 1.1
    - w(s.delegation, wgt.delegation) * 0.5;

  const imagawa =
    + w(s.harassmentAwareness, wgt.harassmentAwareness) * 1.1
    - w(s.updatePower, wgt.updatePower) * 0.5;

  const uesugi =
    + w(s.updatePower, wgt.updatePower) * 0.6
    + w(s.delegation, wgt.delegation) * 0.6;

  return {
    '真田幸村型': sanada,
    '織田信長型': oda,
    '豊臣秀吉型': toyotomi,
    '徳川家康型': tokugawa,
    '斎藤道三型': dosan,
    '今川義元型': imagawa,
    '上杉謙信型': uesugi,
  };
}

/* ============================================================
   説明付き判定（ルール→スコア→タイブレーク）
   ============================================================ */

export type ExplainResult = {
  decided: SamuraiType;
  primaryRule?: RuleHit;
  /** どのルールがヒットしたか（上から順） */
  ruleHits: Array<{ rule: RuleHit; type: SamuraiType }>;
  /** タイブレーク比較のトレース */
  tieBreakTrace: Array<{
    key: CategoryKey;
    winner?: SamuraiType;
    values: Record<SamuraiType, number>;
  }>;
  snapshot: NormalizedCategoryScores;
  configUsed: JudgeConfig;
};

/** 強み寄与（平均） */
export const STRONG_KEYS: CategoryKey[] = ['updatePower', 'delegation'];
/** リスク抑制（平均） */
export const RISK_KEYS: CategoryKey[] = ['orgDrag', 'commGap', 'genGap', 'harassmentAwareness'];

export function explainSamuraiDecision(
  scores0: NormalizedCategoryScores,
  cfg: JudgeConfig = defaultJudgeConfig,
): ExplainResult {
  // どちらのキーでも落ちないよう、まず揃える
  const s = ensureHarassmentAliases({
    delegation: clamp03(scores0.delegation),
    orgDrag: clamp03(scores0.orgDrag),
    commGap: clamp03(scores0.commGap),
    updatePower: clamp03(scores0.updatePower),
    genGap: clamp03(scores0.genGap),
    harassmentAwareness: clamp03(scores0.harassmentAwareness),
  });

  // 1) ルール評価
  const checks: RuleCheck[] = [
    checkSanada(s, cfg),
    checkOda(s, cfg),
    checkToyotomi(s, cfg),
    checkTokugawa(s, cfg),
    checkDosan(s, cfg),
    checkImagawa(s, cfg),
  ];
  const hits = checks.filter((c) => c.hit);
  // ルール優先順で最初のヒットを採用（無ければ undefined）
  const first = cfg.rulePriority
    .map((r) => hits.find((h) => h.rule === r))
    .find(Boolean);

  // 2) 合致度スコア
  const tbl = compatibilityScoreByType(s, cfg);
  const byScore = (Object.keys(tbl) as SamuraiType[])
    .map((t) => ({ type: t, score: Number(tbl[t] ?? 0) }))
    .sort((a, b) => b.score - a.score);
  const topScore = byScore[0]?.score ?? -Infinity;
  let topGroup = byScore.filter((x) => Math.abs(x.score - topScore) < 1e-9);

  // 3) タイブレーク（順に比較）
  const trace: ExplainResult['tieBreakTrace'] = [];
  if (topGroup.length > 1) {
    for (const key of cfg.tieBreakPriority) {
      const values: Record<SamuraiType, number> = Object.create(null);
      for (const r of topGroup) values[r.type] = clamp03((s as any)[key]);

      // 高いほど優先（updatePower/ delegation など）
      let winner = topGroup
        .slice()
        .sort((a, b) => values[b.type] - values[a.type])[0];

      trace.push({ key, winner: winner?.type, values });

      // 同点が続く間は次のキーへ
      if (!winner) continue;
      const best = values[winner.type];
      topGroup = topGroup.filter((x) => Math.abs(values[x.type] - best) < 1e-9);
      if (topGroup.length === 1) break;
    }
  }

  const decided: SamuraiType =
    first?.type ??
    topGroup[0]?.type ??
    cfg.defaultFallback;

  return {
    decided,
    primaryRule: first?.rule,
    ruleHits: hits.map(({ rule, type }) => ({ rule, type })),
    tieBreakTrace: trace,
    snapshot: s,
    configUsed: cfg,
  };
}

/* ============================================================
   互換API
   ============================================================ */

export function judgeSamurai(scores: NormalizedCategoryScores, cfg: JudgeConfig = defaultJudgeConfig): SamuraiType {
  return explainSamuraiDecision(scores, cfg).decided;
}

/** 既存互換（旧名） */
export const judgeSamuraiType = judgeSamurai;

/* ============================================================
   互換のための簡易エクスポート
   - 他モジュールが `samuraiDescriptions` を期待しても落ちないようダミーを提供
   ============================================================ */
export const samuraiDescriptions = {
  SANADA: { title: '' } as any,
  ODA: { title: '' } as any,
  TOYOTOMI: { title: '' } as any,
  TOKUGAWA: { title: '' } as any,
  UESUGI: { title: '' } as any,
  SAITO: { title: '' } as any,
  IMAGAWA: { title: '' } as any,
} as any;
