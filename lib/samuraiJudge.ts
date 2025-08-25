// lib/samuraiJudge.ts

// 7タイプ
export type SamuraiType =
  | '真田幸村型'  // 理想進化
  | '今川義元型'  // 停滞・旧体依存
  | '斎藤道三型'  // 独裁・強引
  | '織田信長型'  // 革新トップダウン
  | '豊臣秀吉型'  // 共創・巻き込み
  | '徳川家康型'  // 慎重・守り・構造重視
  | '上杉謙信型'; // 精神性・高潔（ややアップデート控えめ）

// 6カテゴリ（0.0〜3.0で正規化済み）
// ※ 組織進化阻害／無自覚ハラスメント傾向 は「高い＝良好」に正規化済み想定
export interface CategoryScores {
  'アップデート力': number;
  'コミュ力誤差': number;
  'ジェネギャップ感覚': number;
  '組織進化阻害': number;       // 高いほど障害が少ない（=良）
  '無自覚ハラスメント傾向': number; // 高いほどハラスレス（=良）
  '権限委譲・構造健全度': number;
}

// （任意）タイプ説明
export const samuraiDescriptions: Record<SamuraiType, string> = {
  '真田幸村型': '全体が高水準でバランス型。挑戦も安定も両立する理想の経営者タイプ。',
  '織田信長型': '攻めが速く変化を恐れないチャレンジャー。AI時代の勝ち筋を先読みする。',
  '豊臣秀吉型': '対話と巻き込みで共創を起こす。信頼が厚く、安定成長と改革のバランス◎。',
  '徳川家康型': '構造とガバナンスを整え、堅実に積み上げる守りの名手。',
  '上杉謙信型': '倫理観と高潔さが強み。現場への敬意が厚い。アップデートはやや控えめ。',
  '斎藤道三型': '突破力は高いが独断専行に注意。委譲／倫理／対話が課題。',
  '今川義元型': '今のままだと時代に取り残される恐れ。まずは現状把握と意識変革から。',
};

// しきい値（0〜3レンジ前提）
const HI = 2.6;      // 明確に高い
const MID_HI = 2.4;  // けっこう高い
const MID = 2.1;     // ふつう以上
const LOW = 1.8;     // 低め
const VERY_LOW = 1.4;// かなり低い

export function judgeSamuraiType(scores: CategoryScores): SamuraiType {
  const upd = scores['アップデート力'];
  const com = scores['コミュ力誤差'];
  const gen = scores['ジェネギャップ感覚'];
  const org = scores['組織進化阻害'];        // 高い=良
  const har = scores['無自覚ハラスメント傾向']; // 高い=良
  const del = scores['権限委譲・構造健全度'];

  const vals = [upd, com, gen, org, har, del];
  const avg = vals.reduce((a, b) => a + b, 0) / vals.length;
  const min = Math.min(...vals);
  const hiCount = vals.filter(v => v >= HI).length;
  const lowCount = vals.filter(v => v < LOW).length;

  // 0) 理想進化：全体が高水準 → 真田
  //   - 平均が高い & どのカテゴリも低くない、または「高得点が4つ以上」
  if ((avg >= HI - 0.0 && min >= MID) || (hiCount >= 4 && lowCount === 0)) {
    return '真田幸村型';
  }

  // 1) 停滞：平均がかなり低い、またはアップデートが低く構造/進化も弱い → 今川
  if (avg <= 1.6 || (upd < MID && (del < MID || org < MID))) {
    return '今川義元型';
  }

  // 2) 独裁：アップデートは高いが、倫理/委譲/対話のどれかが低い → 道三
  if (upd >= MID_HI && (har < MID || del < MID || com < 1.9)) {
    return '斎藤道三型';
  }

  // 3) 革新トップダウン：アップデート最強＋（若手/対話もそこそこ）＋致命的なリスクは無し → 信長
  if (upd >= HI && har >= MID && org >= MID) {
    return '織田信長型';
  }

  // 4) 慎重・守り：構造強い＋進化もそこそこ、攻めは中〜やや高 → 家康
  if (del >= HI && org >= MID && upd >= MID && upd < HI) {
    return '徳川家康型';
  }

  // 5) 共創：コミュ／ジェネ／倫理が高め＋委譲そこそこ＋アップデート中以上 → 秀吉
  if (
    (com + gen) / 2 >= MID_HI &&
    har >= MID_HI &&
    del >= MID &&
    upd >= MID
  ) {
    return '豊臣秀吉型';
  }

  // 6) 精神性：倫理と対話は高いが、アップデート控えめ → 謙信
  if (har >= HI && com >= MID_HI && upd < 2.2) {
    return '上杉謙信型';
  }

  // 7) フォールバック：一番強い特徴に寄せる
  const max = Math.max(...vals);
  switch (max) {
    case upd:
      return '織田信長型';
    case del:
    case org:
      return '徳川家康型';
    case com:
    case gen:
      return '豊臣秀吉型';
    case har:
      return upd < MID ? '上杉謙信型' : '豊臣秀吉型';
    default:
      return avg >= MID ? '豊臣秀吉型' : '今川義元型';
  }
}
