// lib/samuraiJudge.ts
//
// 📝 このファイルの考え方（超重要）
// 1) まず「決定木ルール」で“そのタイプらしさの強い信号”が出ていれば即決します。
//    ここで用いる境界値が `TH`（Threshold: しきい値）です。各キーごとに
//    「以上（>=）」「以下（<=）」「未満（<）」の向きが決まっています（下に一覧あり）。
//
// 2) どのルールにも当てはまらない“曖昧ゾーン”では、各タイプの「中心像」へ
//    どれだけ近いか（重み付き距離）で最寄りタイプを選びます。
//    ここで使う中心値が `TARGET` です。TARGET は“しきい値”ではありません。
//    以上 / 以下の判定は効きません。単に「近さ（distance）」を比べます。
//
// 3) 豊臣秀吉は「updatePower と commGap の両方が一定以上」の安全弁を維持。
//    これを満たさない場合、曖昧ゾーンの最寄り計算からも除外します。
// ---------------------------------------------------------------------------

import type { NormalizedCategoryScores, SamuraiType } from "@/types/diagnosis";

/** しきい値：決定木で使う境界（TH = Threshold）
 *
 * ✅ ここに書かれた数値は “境界値” です。TARGET と違って **以上/以下の向きが決まっています**。
 *
 * 各キーの判定向き（by judgeByRule 内で使用）:
 * - 斎藤道三:
 *    - orgDrag >= saito_orgDrag（以上）
 *    - delegation <  saito_delegationMax（未満）
 * - 今川義元:
 *    - harassmentAwareness >= imagawa_har（以上）
 *    - updatePower         <  imagawa_updateMax（未満）
 * - 真田幸村:
 *    - updatePower >= sanada_update（以上）
 *    - delegation >= sanada_delegation（以上）
 * - 織田信長:
 *    - updatePower >= nobunaga_update（以上）
 *    - commGap    <= nobunaga_commMax（以下）
 *    - genGap     <= nobunaga_genMax（以下）
 * - 豊臣秀吉（安全弁も同値を使用）:
 *    - updatePower >= toyotomi_update（以上）
 *    - commGap    >= toyotomi_comm（以上）
 * - 徳川家康:
 *    - delegation >= ieyasu_delegation（以上）
 *    - orgDrag    <= ieyasu_orgMax（以下）
 * - 上杉謙信:
 *    - updatePower         <= uesugi_updateMax（以下）
 *    - genGap              >= uesugi_genGap（以上）
 *    - harassmentAwareness <= uesugi_harMax（以下）
 *    - orgDrag             <= uesugi_orgMax（以下）
 */
const TH = {
  saito_orgDrag: 2.2,
  saito_delegationMax: 2.0,

  imagawa_har: 2.0,
  imagawa_updateMax: 2.2,

  sanada_update: 2.4,
  sanada_delegation: 2.0,

  // ※ SACHIKOさんの基準に合わせて“革新TOPにふさわしい”強めのしきい値
  nobunaga_update: 2.6,
  nobunaga_commMax: 1.2,
  nobunaga_genMax: 1.4,

  toyotomi_update: 1.6,
  toyotomi_comm: 1.6,

  ieyasu_delegation: 2.2,
  ieyasu_orgMax: 1.2,

  uesugi_updateMax: 1.8,
  uesugi_genGap: 2.0,
  uesugi_harMax: 1.8,
  uesugi_orgMax: 1.8,
} as const;

/** 目標ベクトル：曖昧ゾーンでの“中心像”
 *
 * 🔎 TARGET は「こういう数値帯だとこのタイプらしいよね」という**中心値**です。
 * “以上/以下”の判定では使いません。重み付き二乗距離で **近いほど** そのタイプに寄ります。
 * （distance() で使用）
 */
const TARGET: Record<SamuraiType, NormalizedCategoryScores> = {
  "斎藤道三型": {
    updatePower: 1.4,
    genGap: 1.6,
    delegation: 1.4,
    orgDrag: 2.6,          // 高い
    harassmentAwareness: 1.8,
    commGap: 1.6,
  },
  "今川義元型": {
    updatePower: 1.4,      // 低め
    genGap: 1.6,
    delegation: 1.6,
    orgDrag: 1.8,
    harassmentAwareness: 2.4, // 高い
    commGap: 1.4,
  },
  "真田幸村型": {
    updatePower: 2.6,
    genGap: 2.2,
    delegation: 2.2,
    orgDrag: 1.4,
    harassmentAwareness: 1.4,
    commGap: 1.6,
  },
  "織田信長型": {
    updatePower: 2.6,      // 高い
    genGap: 1.0,           // 低い
    delegation: 1.8,
    orgDrag: 1.6,
    harassmentAwareness: 1.4,
    commGap: 1.0,          // 低い
  },
  "豊臣秀吉型": {
    updatePower: 2.0,
    genGap: 2.0,
    delegation: 2.0,
    orgDrag: 1.6,
    harassmentAwareness: 1.4,
    commGap: 2.0,          // 高め
  },
  "徳川家康型": {
    updatePower: 1.6,
    genGap: 1.8,
    delegation: 2.4,       // 高い
    orgDrag: 1.0,          // 低い
    harassmentAwareness: 1.4,
    commGap: 1.6,
  },
  "上杉謙信型": {
    updatePower: 1.6,      // 低め〜中
    genGap: 2.2,           // 理念優先＝ジェネギャップ感じやすい
    delegation: 1.8,
    orgDrag: 1.4,          // 阻害は低め
    harassmentAwareness: 1.2,
    commGap: 1.6,
  },
};

/** 重み（distance の重要度） */
const W = {
  updatePower: 1.0,
  genGap: 0.8,
  delegation: 0.9,
  orgDrag: 1.0,
  harassmentAwareness: 1.0,
  commGap: 0.9,
} as const;

function sq(x: number) { return x * x; }

/** 重み付き距離（小さいほど近い）— TARGET 用 */
function distance(a: NormalizedCategoryScores, b: NormalizedCategoryScores): number {
  return (
    W.updatePower * sq(a.updatePower - b.updatePower) +
    W.genGap * sq(a.genGap - b.genGap) +
    W.delegation * sq(a.delegation - b.delegation) +
    W.orgDrag * sq(a.orgDrag - b.orgDrag) +
    W.harassmentAwareness * sq(a.harassmentAwareness - b.harassmentAwareness) +
    W.commGap * sq(a.commGap - b.commGap)
  );
}

/** 1) ルールで確定（TH を使った決定木） */
function judgeByRule(s: NormalizedCategoryScores): SamuraiType | null {
  // 斎藤（支配・強権）
  if (s.orgDrag >= TH.saito_orgDrag && s.delegation < TH.saito_delegationMax) return "斎藤道三型";

  // 今川（停滞・守り過多）
  if (s.harassmentAwareness >= TH.imagawa_har && s.updatePower < TH.imagawa_updateMax) return "今川義元型";

  // 真田（理想）
  if (s.updatePower >= TH.sanada_update && s.delegation >= TH.sanada_delegation) return "真田幸村型";

  // 織田（革新）
  if (s.updatePower >= TH.nobunaga_update && s.commGap <= TH.nobunaga_commMax && s.genGap <= TH.nobunaga_genMax) {
    return "織田信長型";
  }

  // 豊臣（共創）
  if (s.updatePower >= TH.toyotomi_update && s.commGap >= TH.toyotomi_comm) return "豊臣秀吉型";

  // 家康（慎重・設計）
  if (s.delegation >= TH.ieyasu_delegation && s.orgDrag <= TH.ieyasu_orgMax) return "徳川家康型";

  // 上杉（理念）
  if (
    s.updatePower <= TH.uesugi_updateMax &&
    s.genGap >= TH.uesugi_genGap &&
    s.harassmentAwareness <= TH.uesugi_harMax &&
    s.orgDrag <= TH.uesugi_orgMax
  ) return "上杉謙信型";

  return null;
}

/** 2) 最寄りタイプ（曖昧ゾーンの処理）。TARGET と distance を使用。 */
function nearestType(s: NormalizedCategoryScores): SamuraiType {
  let best: SamuraiType = "上杉謙信型";
  let bestD = Number.POSITIVE_INFINITY;

  (Object.keys(TARGET) as SamuraiType[]).forEach(t => {
    // 豊臣の安全弁：しきい値を満たさない場合は候補から除外
    if (t === "豊臣秀吉型" && !(s.updatePower >= TH.toyotomi_update && s.commGap >= TH.toyotomi_comm)) return;

    const d = distance(s, TARGET[t]);
    if (d < bestD) {
      bestD = d;
      best = t;
    }
  });

  return best;
}

/** 公開API：最終判定
 * 1) ルール（TH）で確定
 * 2) ダメなら最寄りタイプ（TARGET×distance）
 */
export function judgeSamurai(s: NormalizedCategoryScores): SamuraiType {
  const ruled = judgeByRule(s);
  if (ruled) return ruled;

  return nearestType(s);
}
