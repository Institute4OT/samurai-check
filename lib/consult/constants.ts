// lib/consult/constants.ts

export type TopicKey =
  | 'meeting'      // 会議設計・合意形成
  | 'delegation'   // 権限委譲・リーダー育成
  | 'relations'    // 上下・部門の関係性
  | 'engagement'   // エンゲージメント
  | 'career'       // キャリアサポート
  | 'execCoaching' // エグゼクティブコーチング
  | 'brain'        // 思考技術・創発風土
  | 'culture'      // 風土改善
  | 'vision'       // 理念・ビジョン
  | 'other';       // その他

export const TOPICS: { key: TopicKey; label: string }[] = [
  { key: 'meeting',      label: '会議設計・合意形成（会議で決めきる）' },
  { key: 'delegation',   label: '権限委譲・リーダー育成' },
  { key: 'relations',    label: '上司‐部下／部門間の関係性改善' },
  { key: 'engagement',   label: '社員のエンゲージメント向上' },
  { key: 'career',       label: '社員のキャリアサポート' },
  { key: 'execCoaching', label: 'エグゼクティブコーチング（Topの思考整理）' },
  { key: 'brain',        label: '社員の脳力向上（思考技術、創発風土の醸成）' },
  { key: 'culture',      label: '風土改善' },
  { key: 'vision',       label: '理念・ビジョンの構築／浸透' },
  { key: 'other',        label: 'その他（自由記入）' },
];

export const GOAL_CHOICES = [
  '社員のモチベーションや主体性のUP',
  '互いに高めあう社風の醸成',
  '昭和型リーダーシップからの脱却',
  '部門を超えた連携力のUP',
  'DXを加速し、業務効率UP',
  '離職率の低下',
];

export const BOTTLENECK_CHOICES = [
  'トップ営業に依存しており新規開拓が困難',
  '後継者／右腕が育たない',
  '受け身型の社員が多い',
  '改革はしたいが、社内に抵抗勢力がある',
  '古参社員と若手のジェネレーションギャップ',
  '決定しても実行が進まない',
];

export const PRIORITY_CHOICES = [
  '社員同士の関係性・風土の改善',
  '理念やビジョンの構築／浸透',
  '権限委譲・会議設計',
  '社員の意識改革',
  '後継者やリーダーの育成',
  '社員のエンゲージメントの強化',
];

export type StyleKey = 'deep' | 'speed';
export const STYLE_OPTIONS: { key: StyleKey; label: string }[] = [
  { key: 'deep',  label: '深掘り重視：現状把握〜優先順位までしっかり' },
  { key: 'speed', label: 'スピード重視：まずは仮説とヒアリングで次の一手' },
];

export type ConsultantKey = 'ishijima' | 'morigami' | 'either';
