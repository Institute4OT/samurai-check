// lib/comments/generatePersonalComments.ts
// 回答ベースの個別コメント生成（依存なし版：ルール同梱）

export type AnswerLite = { id: number; selectedText: string; score: number };

export type CommentItem = {
  key: string;
  category: "talent" | "challenge";
  text: string;
  weight: number;
};

type AnswerRule = {
  q: number;                        // 0=全設問対象、>0=特定設問
  includes: string | RegExp;
  emit: CommentItem[];
};

// === ルール同梱（q:0 は全設問対象） ===
const answerRules: AnswerRule[] = [
  { q: 0, includes: /権限委譲|任せる|裁量|自律|意思決定を委ね/i,
    emit: [{ key: "delegate_pos", category: "talent", weight: 95,
      text: "任せ方が上手です。自律的に動ける土壌ができています。" }] },
  { q: 0, includes: /トップダウン|細かな指示|承認待ち|稟議|決裁が遅/i,
    emit: [{ key: "delegate_neg", category: "challenge", weight: 95,
      text: "裁量が小さく判断が詰まりやすいです。小さな範囲から委譲を始めましょう。" }] },

  { q: 0, includes: /1on1|ワンオンワン|対話|フィードバック|傾聴|心理的安全/i,
    emit: [{ key: "comms_pos", category: "talent", weight: 90,
      text: "対話の質が高いです。フィードバックが機能し変化が早まります。" }] },
  { q: 0, includes: /メール中心|連絡不足|伝言ゲーム|一方向|サイロ|縦割り/i,
    emit: [{ key: "comms_neg", category: "challenge", weight: 90,
      text: "情報が滞りがちです。短い同期ミーティングや共有基盤の整備が有効です。" }] },

  { q: 0, includes: /小さく試す|実験|トライ|仮説|検証|振り返り|レトロ/i,
    emit: [{ key: "learn_pos", category: "talent", weight: 85,
      text: "小さく試す文化があります。仮説検証の反復で成果が加速します。" }] },
  { q: 0, includes: /前例踏襲|完璧な計画|失敗は許されない|一発勝負/i,
    emit: [{ key: "learn_neg", category: "challenge", weight: 85,
      text: "学習の機会が限定的です。安全に失敗できる範囲を先に決めましょう。" }] },

  { q: 0, includes: /顧客|ユーザー|顧客起点|価値|アウトカム/i,
    emit: [{ key: "customer_pos", category: "talent", weight: 80,
      text: "顧客価値に焦点があります。意思決定の軸がブレにくい状態です。" }] },
  { q: 0, includes: /内向き|部門都合|社内都合|手段先行/i,
    emit: [{ key: "customer_neg", category: "challenge", weight: 80,
      text: "内向きに寄っています。顧客の行動データや生の声を意思決定に織り込みましょう。" }] },

  { q: 0, includes: /KPI|OKR|ダッシュボード|可視化|計測/i,
    emit: [{ key: "measure_pos", category: "talent", weight: 75,
      text: "指標の可視化ができています。振れ幅を早期に検知できます。" }] },
  { q: 0, includes: /勘|根性|気合|雰囲気|感覚/i,
    emit: [{ key: "measure_neg", category: "challenge", weight: 75,
      text: "定量・定性の両輪が弱いです。まずは“数える→見える化”から着手しましょう。" }] },

  { q: 0, includes: /越境|横断|部門連携|巻き込む/i,
    emit: [{ key: "cross_pos", category: "talent", weight: 70,
      text: "部門を越えた連携が見られます。複雑な課題でも推進力が落ちにくいです。" }] },
  { q: 0, includes: /部門最適|縦割り|壁/i,
    emit: [{ key: "cross_neg", category: "challenge", weight: 70,
      text: "部門最適に偏りがちです。共通KPIや混成チームで壁を低くしましょう。" }] },

  { q: 0, includes: /目的|why|方針|原則/i,
    emit: [{ key: "purpose_pos", category: "talent", weight: 65,
      text: "目的が明確です。日々の意思決定が整流されます。" }] },
  { q: 0, includes: /手段が先|方針が曖昧|迷走/i,
    emit: [{ key: "purpose_neg", category: "challenge", weight: 65,
      text: "方針の明確化が必要です。“やらないことリスト”を先に決めましょう。" }] },
];

// --- 実装本体 ---
const norm = (s: string) =>
  (s || "").toLowerCase().replace(/\s+/g, "").replace(/[、。．，・･]/g, "");

export function generatePersonalComments(
  answers: AnswerLite[],
  maxEach: number = 2
): { talents: string[]; challenges: string[] } {
  const picked = new Map<string, CommentItem>(); // key で重複抑止

  for (const a of answers) {
    const hay = norm(a.selectedText);
    for (const r of answerRules) {
      if (r.q !== 0 && a.id !== r.q) continue; // 0=全設問対象
      const hit =
        typeof r.includes === "string"
          ? hay.includes(norm(r.includes))
          : (r.includes as RegExp).test(a.selectedText);
      if (!hit) continue;
      for (const item of r.emit) {
        const prev = picked.get(item.key);
        if (!prev || (prev.weight ?? 0) < (item.weight ?? 0)) {
          picked.set(item.key, item);
        }
      }
    }
  }

  const all = Array.from(picked.values());
  const talents = all
    .filter((i) => i.category === "talent")
    .sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0))
    .slice(0, maxEach)
    .map((i) => i.text);

  const challenges = all
    .filter((i) => i.category === "challenge")
    .sort((a, b) => (b.weight ?? 0) - (a.weight ?? 0))
    .slice(0, maxEach)
    .map((i) => i.text);

  if (talents.length === 0)
    talents.push("前向きな習慣が見られます。続けることが最大の差になります。");
  if (challenges.length === 0)
    challenges.push("手数より“仕組み”の強化が必要です。小さく始めて素早く回しましょう。");

  return { talents, challenges };
}
