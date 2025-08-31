// lib/comments/generatePersonalComments.ts
// 回答テキストに含まれる語句を拾って、社長向けの平易なコメントを生成
// 依存なし（このファイルだけで完結）

export type AnswerLite = { id: number; selectedText: string; score: number };

export type CommentItem = {
  key: string;
  category: "talent" | "challenge";
  text: string;
  weight: number; // 強さの優先度
};

type AnswerRule = {
  q: number;                        // 0=全設問対象、>0=特定設問
  includes: string | RegExp;        // 回答に含まれていればヒット
  emit: CommentItem[];              // 出すコメント（複数可）
};

// ---- 検索を安定させる正規化 ----
const norm = (s: string) =>
  (s || "")
    .toLowerCase()
    .replace(/\s+/g, "")
    .replace(/[、。．，・･]/g, "");

// ===== ルール =====
// ※ 検出語は「回答選択肢」に出やすい素朴な言葉を採用
//   - 任せる/裁量/自律/現場判断
//   - トップダウン/細かな指示/承認待ち/稟議/決裁遅い
//   - 1on1/面談/対話/フィードバック/傾聴/心理的安全
//   - メール中心/連絡不足/伝言ゲーム/一方向/サイロ/縦割り
//   - 小さく試す/実験/仮説/検証/振り返り
//   - 前例踏襲/完璧な計画/失敗は許されない/一発勝負
//   - 顧客/ユーザー/顧客起点/価値
//   - 内向き/部門都合/社内都合/手段先行
//   - 数字/見える化/記録/メーター/計測/ダッシュボード
//   - 勘/根性/気合/雰囲気/感覚
//   - 越境/横断/巻き込む
//   - 部門最適/縦割り/壁
//   - 目的/why/方針/原則
//   - 手段が先/方針が曖昧/迷走
const rules: AnswerRule[] = [
  // --- 権限委譲 / 任せる ---
  { q: 0, includes: /任せる|裁量|自律|現場判断/i,
    emit: [{ key: "delegate_pos", category: "talent", weight: 95,
      text: "任せ方がうまいです。仕事の決め事を一枚にまとめ、任せ先が迷わないようにしましょう。" }] },
  { q: 0, includes: /トップダウン|細かな指示|承認待ち|稟議|決裁が?遅/i,
    emit: [{ key: "delegate_neg", category: "challenge", weight: 95,
      text: "判断の待ち時間が長いです。『○○までなら現場で決めてよい』という基準を先に決めましょう。" }] },

  // --- コミュニケーション ---
  { q: 0, includes: /1on1|ワンオンワン|面談|対話|フィードバック|傾聴|心理的安全/i,
    emit: [{ key: "comms_pos", category: "talent", weight: 90,
      text: "短い打ち合わせで互いの状況を合わせられています。続けていきましょう。" }] },
  { q: 0, includes: /メール中心|連絡不足|伝言ゲーム|一方向|サイロ|縦割り/i,
    emit: [{ key: "comms_neg", category: "challenge", weight: 90,
      text: "連絡が一方通行になりがちです。週1回15分の打ち合わせで状況をそろえましょう。" }] },

  // --- 学び・小さく試す ---
  { q: 0, includes: /小さく試す|実験|トライ|仮説|検証|振り返り|レトロ/i,
    emit: [{ key: "learn_pos", category: "talent", weight: 85,
      text: "小さく試して学ぶ動きがあります。試しは一つずつ、終わりの期日を先に決めましょう。" }] },
  { q: 0, includes: /前例踏襲|完璧な計画|失敗は許されない|一発勝負/i,
    emit: [{ key: "learn_neg", category: "challenge", weight: 85,
      text: "大きく構えすぎです。2週間で終わる小さな試しを1つ選び、終わったら振り返りましょう。" }] },

  // --- 顧客起点 ---
  { q: 0, includes: /顧客|ユーザー|顧客起点|価値|アウトカム/i,
    emit: [{ key: "customer_pos", category: "talent", weight: 80,
      text: "お客さまの見方ができています。会議の前に『お客さまの一言』を1つ共有すると早く決まります。" }] },
  { q: 0, includes: /内向き|部門都合|社内都合|手段先行/i,
    emit: [{ key: "customer_neg", category: "challenge", weight: 80,
      text: "内向きに寄っています。会議の冒頭でお客さまの声を1つ共有し、次の一手を決めましょう。" }] },

  // --- 見える化（数字を見る習慣） ---
  { q: 0, includes: /数字|見える化|可視化|記録|計測|メーター|ダッシュボード/i,
    emit: [{ key: "measure_pos", category: "talent", weight: 75,
      text: "数字を見て動けています。見る数字は3つだけに絞り、毎週同じタイミングで確認しましょう。" }] },
  { q: 0, includes: /勘|根性|気合|雰囲気|感覚/i,
    emit: [{ key: "measure_neg", category: "challenge", weight: 75,
      text: "勘に頼りがちです。見る数字を3つだけ決め、毎週同じ曜日に確認しましょう。" }] },

  // --- 越境・横断 ---
  { q: 0, includes: /越境|横断|巻き込む/i,
    emit: [{ key: "cross_pos", category: "talent", weight: 70,
      text: "部門を越えて動けています。窓口を1つにすると、進みがさらに早くなります。" }] },
  { q: 0, includes: /部門最適|縦割り|壁/i,
    emit: [{ key: "cross_neg", category: "challenge", weight: 70,
      text: "部門の壁で止まりやすいです。窓口を1つにし、決める場と進める場を分けましょう。" }] },

  // --- 目的・方針 ---
  { q: 0, includes: /目的|why|方針|原則/i,
    emit: [{ key: "purpose_pos", category: "talent", weight: 65,
      text: "目的や方針がはっきりしています。『やらないことリスト』を更新して判断の手間を減らしましょう。" }] },
  { q: 0, includes: /手段が?先|方針が?曖昧|迷走/i,
    emit: [{ key: "purpose_neg", category: "challenge", weight: 65,
      text: "やることが増えすぎています。今月は『やらないこと』を3つ決め、残りに集中しましょう。" }] },
];

// ---- 本体 ----
export function generatePersonalComments(
  answers: AnswerLite[],
  maxEach: number = 2
): { talents: string[]; challenges: string[] } {
  const picked = new Map<string, CommentItem>(); // keyで重複抑止

  for (const a of answers) {
    const hay = norm(a.selectedText);
    for (const r of rules) {
      if (r.q !== 0 && a.id !== r.q) continue;  // 0=全設問対象
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

  // 何も拾えなかった時の保険（社長向け・平易）
  if (talents.length === 0)
    talents.push("よい流れがあります。今のやり方で『続けること』を決めましょう。");
  if (challenges.length === 0)
    challenges.push("まずは2週間で終わる小さな一歩を1つ決め、終わったら振り返りましょう。");

  return { talents, challenges };
}
