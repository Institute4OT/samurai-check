// /lib/quizQuestions.ts

export interface QuizQuestion {
  id: number; // 1..16（固定ID。表示番号ではない）
  questionText: string; // 旧「Qxx.」は埋め込まない（画面側で付与する）
  options: { text: string; score: number }[];
  isMultipleChoice: boolean;
  progressPercentage: number; // 進捗UI用（任意）
}

/* =========================================================
   並び順・ブロック見出し（このファイルで一元管理）
   ─ 使わない場合は無視してOK ─
========================================================= */

export const DISPLAY_ORDER: string[] = [
  "Q2",
  "Q3",
  "Q5",
  "Q10",
  "Q4",
  "Q1",
  "Q11",
  "Q8",
  "Q6",
  "Q9",
  "Q7",
  "Q12",
  "Q15",
  "Q16",
  "Q13",
  "Q14",
];

export const BLOCKS: { title: string; items: string[] }[] = [
  { title: "初動・意思・根拠", items: ["Q2", "Q3", "Q5", "Q10"] },
  { title: "仕組み・通り道", items: ["Q4", "Q1", "Q11", "Q8"] },
  { title: "土壌・受容性・学習", items: ["Q6", "Q9", "Q7", "Q12"] },
  { title: "人材の能力発揮", items: ["Q15", "Q16", "Q13"] },
  { title: "進化スピードの分かれ道", items: ["Q14"] },
];

/** 並び替えが必要な画面で使うユーティリティ（任意） */
export function orderQuiz(all: QuizQuestion[]) {
  const idToCode = (id: number) => `Q${id}`;
  const byId = new Map(all.map((q) => [idToCode(q.id), q]));
  const out: QuizQuestion[] = [];

  DISPLAY_ORDER.forEach((code) => {
    const hit = byId.get(code);
    if (hit) {
      out.push(hit);
      byId.delete(code);
    }
  });
  for (const rest of byId.values()) out.push(rest); // 余りは末尾
  return out;
}

/* =========================================================
   設問データ本体（questionText から旧「Qxx.」を完全撤去）
========================================================= */

export const quizQuestions: QuizQuestion[] = [
  // Q1
  {
    id: 1,
    questionText: "自社の会議でよくあるパターンとは？（複数選択可・最大３つ）",
    options: [
      { text: "説明や指示が中心で、他メンバーの発言が少ない", score: 0 },
      { text: "意見を求めてもなかなか出てこない", score: 1 },
      { text: "議論は活発だが、長丁場／担当や期限が曖昧になりがち", score: 2 },
      { text: "トップや特定の人の案で決まることが多い", score: 1 },
      { text: "特に問題は感じず、活発に議論できている", score: 3 },
      {
        text: "トラブル等の原因や経緯の追及に時間を費やすことが多い",
        score: 0,
      },
      { text: "報告だけで終わる／議題なしの定例がある", score: 0 },
    ],
    isMultipleChoice: true,
    progressPercentage: 6.3,
  },

  // Q2
  {
    id: 2,
    questionText:
      "新しい提案が上がってきた時、あなたはどのように関わることが多いですか？（単一選択）",
    options: [
      { text: "新しい提案は、却下することが多い", score: 0 },
      { text: "スピードの観点からも自分がすべて指示する", score: 0 },
      { text: "最終的な判断は自分が行うが、一部は任せる", score: 1 },
      { text: "担当者を決め、まずは小さく試してもらう", score: 2 },
      { text: "関係部署と会議を設け、そこで決定する", score: 2 },
      { text: "目的と制約を示すだけで、実行は全て任せる", score: 3 },
    ],
    isMultipleChoice: false,
    progressPercentage: 12.5,
  },

  // Q3
  {
    id: 3,
    questionText:
      "新しい技術や市場のトレンドについて、あなたのスタンスは？（単一選択）",
    options: [
      { text: "流行には乗らない。既存のやり方を優先", score: 0 },
      {
        text: "自社の伝統は大切にしつつ、部分的に新しいことにも関心を持つ",
        score: 1,
      },
      {
        text: "他社の成功事例を参考に、安全性を確認してから取り入れる",
        score: 1,
      },
      { text: "新しいことは積極的に試すことが多い", score: 2 },
      { text: "他社よりも早く、自社が新しいことを生み出したい", score: 3 },
      {
        text: "異業種や全く違う分野の考え方から新しいヒントを探している",
        score: 3,
      },
    ],
    isMultipleChoice: false,
    progressPercentage: 18.8,
  },

  // Q4
  {
    id: 4,
    questionText:
      "社員との関係について、次のうち当てはまるものをすべて選んでください（複数選択可・最大３つ）",
    options: [
      { text: "話といえば主に業務連絡で、プライベートな話は出ない", score: 0 },
      { text: "ミスやトラブル報告が遅れて出てくる", score: 0 },
      {
        text: "こちらが聞けば答えるが、社員から話しかけられることは少ない",
        score: 0,
      },
      { text: "すぐに名前が出てこない社員がいる", score: 0 },
      { text: "社員から気軽に声を掛けられる方だと思う", score: 2 },
      { text: "社員の顔と名前は一致しているが深くは知らない", score: 1 },
      { text: "一人ひとりの個性や強みまで把握している", score: 3 },
      {
        text: "現場の社員たちの声を聴くことは自分にとっていい刺激になっている",
        score: 3,
      },
    ],
    isMultipleChoice: true,
    progressPercentage: 25.0,
  },

  // Q5
  {
    id: 5,
    questionText:
      "あなたが会社経営で重視していることは？（複数選択可・最大３つ）",
    options: [
      { text: "これまでのやり方／前例を大事にしている", score: 0 },
      { text: "最終的には自分の勘で決める", score: 0 },
      { text: "経験や場数", score: 1 },
      { text: "データや外部環境の変化", score: 3 },
      { text: "現場や若手の声を積極的に取り入れる", score: 3 },
      { text: "SDGsや社会課題への貢献", score: 2 },
      { text: "多様性や人権意識（ダイバーシティなど）", score: 2 },
      { text: "地域・社会との共生", score: 2 },
      { text: "外部の専門家によるアドバイス", score: 1 },
    ],
    isMultipleChoice: true,
    progressPercentage: 31.3,
  },

  // Q6
  {
    id: 6,
    questionText:
      "社員の働き方についてあなたが大切だと思うことは？（複数選択可・最大３つ）",
    options: [
      { text: "仕事は遊びではないので、楽しくなくて当たり前", score: 0 },
      { text: "社員は指示通り動いてくれればいい", score: 0 },
      { text: "敬語や服装などの礼儀や上下関係の規律", score: 1 },
      {
        text: "ジョブローテーションで、幅広い視野とスキルを身につけること",
        score: 1,
      },
      { text: "多様な働き方を積極的に取り入れたい", score: 2 },
      { text: "自社の社員にこだわらず、外部の力も借りる", score: 2 },
      { text: "一人ひとりが最大のパフォーマンスを発揮できること", score: 3 },
      { text: "形式にこだわらず、互いに切磋琢磨して成長すること", score: 3 },
    ],
    isMultipleChoice: true,
    progressPercentage: 37.5,
  },

  // Q7
  {
    id: 7,
    questionText: "社内のDXやAI導入へのあなたの姿勢に近いものは？（単一選択）",
    options: [
      { text: "先行導入して小さく回し、現場で運用改善を進めている", score: 3 },
      { text: "計画立案・情報収集中で、試行・検証の準備をしている", score: 2 },
      { text: "社内に抵抗勢力があり、導入には苦戦中", score: 1 },
      { text: "重要性は理解しているが、他優先で着手できていない", score: 0 },
      { text: "「自社の業界には関係ない」と考えている", score: 0 },
    ],
    isMultipleChoice: false,
    progressPercentage: 43.8,
  },

  // Q8（単一選択）
  {
    id: 8,
    questionText:
      "組織のビジョンやミッションを社員に伝えるために、どのようなことをしていますか？（単一選択）",
    options: [
      { text: "事業特性上、あえて明文化はしていない", score: 0 },
      { text: "Webサイトや冊子への掲載、社内掲示等で周知", score: 0 },
      { text: "朝礼で唱和し、浸透をはかっている", score: 1 },
      {
        text: "現場の業務にどう活かすべきか、社員たちと考える場を設けている",
        score: 2,
      },
      {
        text: "時代や社会の変化に合わせて、社員と話し合いながら内容を見直している",
        score: 2,
      },
      {
        text: "社員が自ら「会社や自分たちのビジョン」について語り、行動できる状態になっている",
        score: 3,
      },
    ],
    isMultipleChoice: false,
    progressPercentage: 50.0,
  },

  // Q9
  {
    id: 9,
    questionText: "最近、こんな現象はありませんか？（複数選択可・最大３つ）",
    options: [
      {
        text: "以前は発言していた社員が、最近あまり発言しなくなった",
        score: 0,
      },
      { text: "古参の社員は残っているが、中途や若手の定着率がイマイチ", score: 0 },
      { text: "最近、中間管理職の元気がないような気がする", score: 1 },
      { text: "アイデアは出るが、実現まで至らないことが多い", score: 2 },
      {
        text: "社員同士が、性別や年齢、役職等の壁を越えて交流しているようだ",
        score: 3,
      },
      { text: "「この会社で挑戦したい」と言ってくれる社員がいる", score: 3 },
      { text: "部門を越えた対話やアイデアの共有が起きている", score: 3 },
      {
        text: "上司に対しても率直なフィードバックが出てくる空気がある",
        score: 3,
      },
    ],
    isMultipleChoice: true,
    progressPercentage: 56.3,
  },

  // Q10
  {
    id: 10,
    questionText: "変革に対するあなた自身の「変わる覚悟」は？（単一選択）",
    options: [
      { text: "まず自分が変わる覚悟で行動している／始めている", score: 3 },
      { text: "頭では理解し、部分的に着手しているが継続が課題", score: 2 },
      {
        text: "変わることは大事だと思うが、今のやり方でも大きな問題は感じていない",
        score: 1,
      },
      { text: "必要になったら変わるつもりでいる", score: 0 },
      {
        text: "世代交代の観点からも、まずは現場主導で変わるのが望ましいと思う",
        score: 0,
      },
    ],
    isMultipleChoice: false,
    progressPercentage: 62.5,
  },

  // Q11
  {
    id: 11,
    questionText:
      "あなたは社員に対して、どのような気持ちで接していますか？（単一選択）",
    options: [
      { text: "正直、もっといい人材が欲しい", score: 0 },
      { text: "働きぶりを常に確認できる仕組みを導入している", score: 0 },
      {
        text: "新規顧客の開拓は自分（社長）が行わないとうまくいかない",
        score: 0,
      },
      {
        text: "基本的に信用しているが、重要なところは自分が握っている",
        score: 1,
      },
      { text: "社員にもよるが、任せられる人には任せている", score: 2 },
      { text: "任せてはいるが、心のどこかで不安を感じている", score: 2 },
      { text: "うまくいかないことも含めて、社員を信じて任せている", score: 3 },
    ],
    isMultipleChoice: false,
    progressPercentage: 68.8,
  },

  // Q12
  {
    id: 12,
    questionText:
      "ここ数年、社員の離職や休職にどのような傾向を感じていますか？（複数選択可・最大３つ）",
    options: [
      { text: "退職代行を使う社員が出てきた", score: 0 },
      { text: "メンタル不調による退職者／休職者が一定数いる", score: 0 },
      { text: "若手ほどあっさり辞めていく傾向がある", score: 0 },
      {
        text: "退職理由は「介護」「出産」「スキルアップ」などが多い",
        score: 1,
      },
      {
        text: "退職後もイベントに参加してくれる等ゆるく繋がっている人がいる",
        score: 2,
      },
      {
        text: "退職後、業務委託などで今も一緒に仕事をしている人がいる",
        score: 3,
      },
      { text: "社員が辞めることは滅多にない", score: 3 },
    ],
    isMultipleChoice: true,
    progressPercentage: 75.0,
  },

  // Q13
  {
    id: 13,
    questionText:
      "あなたの会社での意思決定で、当てはまるものを全て選んでください（複数選択可・最大３つ）",
    options: [
      {
        text: "合議制はあるが、社長／強い役員が結論を翻すことがある",
        score: 0,
      },
      {
        text: "自分の判断でプロジェクトを止めたり動かしたりすることがある",
        score: 0,
      },
      { text: "大きな投資でも相談なく独断で決めることがある", score: 0 },
      { text: "決裁は会議より「根回し」で決まることが多い", score: 1 },
      { text: "最終判断は社長まで上がるが、現場の声も反映される", score: 2 },
      { text: "意思決定は一定のルールに基づいて行われている", score: 3 },
      {
        text: "会議で意見を出し合い、納得した上で合意が形成されている",
        score: 3,
      },
      { text: "部署やチームに意思決定を委ねる場面が増えてきた", score: 3 },
    ],
    isMultipleChoice: true,
    progressPercentage: 81.3,
  },

  // Q14
  {
    id: 14,
    questionText:
      "あなたが不在でも、会社が回る体制になっていますか？（単一選択）",
    options: [
      { text: "現状では、自分抜きではどうにもならない", score: 0 },
      { text: "一応、幹部はいるが最終判断は全部自分がしている", score: 1 },
      {
        text: "幹部が判断することもあるが、重要案件は自分の承認が必要",
        score: 2,
      },
      { text: "信頼できる右腕がいて、ほとんど任せている", score: 2 },
      { text: "自分が不在でも、会社が問題なく回る体制になっている", score: 3 },
    ],
    isMultipleChoice: false,
    progressPercentage: 87.5,
  },

  // Q15
  {
    id: 15,
    questionText:
      "日常コミュニケーションで、プライベートや属性に関わる話題はどう扱うことが多いですか？（単一選択）",
    options: [
      {
        text: "仕事に集中したいので、職場での話題＝仕事関係のみに限定",
        score: 0,
      },
      {
        text: "ざっくばらんな関係が大事。プライベートなことにも遠慮なく触れる",
        score: 0,
      },
      {
        text: "皆大人なので、それぞれ自己管理すべき",
        score: 0,
      },
      {
        text: "自分は、プライベートな話題は相手が自ら言及した場合のみ応じる形にしている",
        score: 1,
      },
      {
        text: "社内は、同意のないプライベート質問や属性コメントは避ける運用にしている",
        score: 2,
      },
      {
        text: "属性・家庭・妊娠等のNGガイドを置き、役職者向けトレーニングを回している",
        score: 3,
      },
    ],
    isMultipleChoice: false,
    progressPercentage: 93.8,
  },

  // Q16
  {
    id: 16,
    questionText:
      "あなたの組織のハラスメント相談窓口等の人事運用について、該当するものは？（複数選択可・最大３つ）",
    options: [
      { text: "そういう相談窓口は設置していない", score: 0 },
      { text: "相談は直属の上長が受けるのが基本", score: 0 },
      { text: "性別で異なる服装/制服などの慣行が残っている", score: 0 },
      {
        text: "相談は社内の特定者（担当者）が受ける体制で、見直しを進めている",
        score: 1,
      },
      { text: "管理職は男性が多いが、改善しようとしている", score: 1 },
      { text: "社内に複数（直属以外）の相談窓口を設置している", score: 2 },
      { text: "性別によらない評価/昇格基準の明文化あり", score: 2 },
      { text: "相談窓口は、外部を含み複線化している", score: 3 },
      {
        text: "昇格・配置の公平性を定期モニターしている（例：女性管理職比率）",
        score: 3,
      },
    ],
    isMultipleChoice: true,
    progressPercentage: 100.0,
  },
];
