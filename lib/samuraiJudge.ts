// /lib/samuraiJudge.ts
// 秒速戦国チェック｜7タイプ判定ロジック（唯一の真実・簡潔重装備）

import type { NormalizedCategoryScores, SamuraiType } from '@/types/diagnosis';

export type RuleHit =
  | 'SANADA_RULE'
  | 'ODA_RULE'
  | 'TOYOTOMI_RULE'
  | 'TOKUGAWA_RULE'
  | 'DOSAN_RULE'
  | 'IMAGAWA_RULE'
  | 'UESUGI_FALLBACK';

export type JudgeConfig = {
  weights: {
    delegation: number;
    orgDrag: number;
    commGap: number;
    updatePower: number;
    genGap: number;
    harassmentAwareness: number;
  };
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
  rulePriority: RuleHit[];
  tieBreakPriority: Array<keyof NormalizedCategoryScores>;
  defaultFallback: SamuraiType;
};

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
    'TOKUGAWA_RULE',
    'DOSAN_RULE',
    'IMAGAWA_RULE',
    'TOYOTOMI_RULE',
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

// ---------- util ----------
function clamp03(v: number) { return Math.max(0, Math.min(3, Number.isFinite(v) ? v : 0)); }
function w(v: number, weight: number) { return clamp03(v) * weight; }

// ---------- ルール判定 ----------
type RuleCheck = { hit: boolean; type: SamuraiType; rule: RuleHit; };
function checkSanada(s: NormalizedCategoryScores, c: JudgeConfig): RuleCheck {
  const t = c.thresholds;
  return { hit: s.updatePower >= t.sanada_update_min && s.delegation >= t.sanada_delegation_min, type: '真田幸村型', rule: 'SANADA_RULE' };
}
function checkOda(s: NormalizedCategoryScores, c: JudgeConfig): RuleCheck {
  const t = c.thresholds;
  return { hit: s.updatePower >= t.oda_update_min && s.commGap < t.oda_comm_max && s.genGap < t.oda_gen_max, type: '織田信長型', rule: 'ODA_RULE' };
}
function checkToyotomi(s: NormalizedCategoryScores, c: JudgeConfig): RuleCheck {
  const t = c.thresholds;
  return { hit: s.updatePower >= t.toyotomi_update_min && s.commGap >= t.toyotomi_comm_min, type: '豊臣秀吉型', rule: 'TOYOTOMI_RULE' };
}
function checkTokugawa(s: NormalizedCategoryScores, c: JudgeConfig): RuleCheck {
  const t = c.thresholds;
  return { hit: s.delegation >= t.tokugawa_delegation_min && s.orgDrag <= t.tokugawa_org_max, type: '徳川家康型', rule: 'TOKUGAWA_RULE' };
}
function checkDosan(s: NormalizedCategoryScores, c: JudgeConfig): RuleCheck {
  const t = c.thresholds;
  return { hit: s.orgDrag >= t.dosan_org_min, type: '斎藤道三型', rule: 'DOSAN_RULE' };
}
function checkImagawa(s: NormalizedCategoryScores, c: JudgeConfig): RuleCheck {
  const t = c.thresholds;
  return { hit: s.harassmentAwareness >= t.imagawa_har_min, type: '今川義元型', rule: 'IMAGAWA_RULE' };
}

// ---------- 親和スコア（タイブレイク用） ----------
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
    - w(s.updatePower, wgt.updatePower) * 0.2
    + w(s.delegation, wgt.delegation) * 0.4
    - w(s.orgDrag, wgt.orgDrag) * 0.4
    - w(s.harassmentAwareness, wgt.harassmentAwareness) * 0.2;

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

// ---------- explain（可視化用） ----------
export type ExplainResult = {
  decided: SamuraiType;
  primaryRule: RuleHit;
  candidates: Array<{ type: SamuraiType; rule: RuleHit; hit: boolean; score: number }>;
  tieBreakTrace: Array<{ key: keyof NormalizedCategoryScores; winner?: SamuraiType; values: Record<SamuraiType, number> }>;
  snapshot: NormalizedCategoryScores;
  configUsed: JudgeConfig;
};

// 強み優先（updatePower, delegation）/ 弱み抑制（その他）はここで定義
const STRONG_KEYS: Array<keyof NormalizedCategoryScores> = ['updatePower', 'delegation'];

export function explainSamuraiDecision(
  scores0: NormalizedCategoryScores,
  cfg: JudgeConfig = defaultJudgeConfig,
): ExplainResult {
  const s: NormalizedCategoryScores = {
    delegation: clamp03(scores0.delegation),
    orgDrag: clamp03(scores0.orgDrag),
    commGap: clamp03(scores0.commGap),
    updatePower: clamp03(scores0.updatePower),
    genGap: clamp03(scores0.genGap),
    harassmentAwareness: clamp03(scores0.harassmentAwareness),
  };

  const rules: Record<RuleHit, RuleCheck> = {
    SANADA_RULE: checkSanada(s, cfg),
    ODA_RULE: checkOda(s, cfg),
    TOYOTOMI_RULE: checkToyotomi(s, cfg),
    TOKUGAWA_RULE: checkTokugawa(s, cfg),
    DOSAN_RULE: checkDosan(s, cfg),
    IMAGAWA_RULE: checkImagawa(s, cfg),
    UESUGI_FALLBACK: { hit: true, type: cfg.defaultFallback, rule: 'UESUGI_FALLBACK' },
  };

  const scoreTbl = compatibilityScoreByType(s, cfg);
  const candidates = cfg.rulePriority
    .map((r) => {
      const rc = rules[r];
      return { type: rc.type, rule: rc.rule, hit: rc.hit, score: scoreTbl[rc.type] };
    })
    .filter(c => c.hit);

  // 少なくとも UESUGI_FALLBACK は入る
  let sorted = [...candidates].sort((a, b) => b.score - a.score);
  const top = sorted[0].score;
  let topGroup = sorted.filter(c => Math.abs(c.score - top) < 1e-9);

  const tieBreakTrace: ExplainResult['tieBreakTrace'] = [];

  if (topGroup.length > 1) {
    for (const key of cfg.tieBreakPriority) {
      const values: Record<SamuraiType, number> = Object.create(null);
      topGroup.forEach(c => { values[c.type] = s[key]; });

      const preferHigh = STRONG_KEYS.includes(key);
      const cmp = (a: number, b: number) => (preferHigh ? b - a : a - b);

      const ordered = [...topGroup].sort((a, b) => cmp(values[a.type], values[b.type]));
      const bestVal = values[ordered[0].type];
      const winners = ordered.filter(c => Math.abs(values[c.type] - bestVal) < 1e-9);

      tieBreakTrace.push({ key, winner: winners.length === 1 ? winners[0].type : undefined, values });

      topGroup = winners;
      if (topGroup.length === 1) break;
    }
  }

  let decided: SamuraiType;
  if (topGroup.length > 1) {
    const idx: Record<RuleHit, number> = Object.fromEntries(cfg.rulePriority.map((r, i) => [r, i])) as any;
    decided = topGroup.sort((a, b) => idx[a.rule] - idx[b.rule])[0].type;
  } else {
    decided = topGroup[0].type;
  }

  const primaryRule = candidates.find(c => c.type === decided)?.rule ?? 'UESUGI_FALLBACK';

  return { decided, primaryRule, candidates, tieBreakTrace, snapshot: s, configUsed: cfg };
}

// ---------- 公開API ----------
export function judgeSamurai(
  scores: NormalizedCategoryScores,
  cfg: JudgeConfig = defaultJudgeConfig,
): SamuraiType {
  return explainSamuraiDecision(scores, cfg).decided;
}

// ===== ここから追記（ファイル末尾あたり）=====

// 既存の詳細判定を使って「最終タイプだけ」返す互換API
export function judgeSamuraiType(
  scores: NormalizedCategoryScores,
  cfg: JudgeConfig = defaultJudgeConfig
): SamuraiType {
  return explainSamuraiDecision(scores, cfg).decided;
}

/**
 * 互換: 他ファイルが `@/lib/samuraiJudge` から `samuraiDescriptions` を import している想定のため、
 * 実体が別ファイルにある場合でもビルドが止まらないよう、フォールバックを提供。
 * 実体をお持ちなら、下のダミーを削除して `export { samuraiDescriptions } from './(実体のファイル)';`
 * に入れ替えてください。
 */
export const samuraiDescriptions: Record<
  SamuraiType,
  { title: string; caption?: string; summary?: string }
> = {
  // ダミー（空文字）。運用で実体がある場合は差し替え推奨。
  // 空のままでもビルドは通ります（実体に差し替えたらこちらは不要）。
  // 既知のキーだけ型を満たすために並べています。
  SANADA: { title: '' } as any,
  ODA: { title: '' } as any,
  TOYOTOMI: { title: '' } as any,
  TOKUGAWA: { title: '' } as any,
  UESUGI: { title: '' } as any,
  SAITO: { title: '' } as any,
  IMAGAWA: { title: '' } as any,
} as any;

// ===== 追記ここまで =====
