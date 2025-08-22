export interface QuizQuestion {
  id: number;
  questionText: string;
  options: { text: string; score: number }[];
  isMultipleChoice: boolean;
  progressPercentage: number;
}

export const quizQuestions: QuizQuestion[] = [
  {
    id: 1,
    questionText: "Q1. 自社の会議でよくあるパターンとは？（複数選択可・最大３つまで）",
    options: [
      { text: "説明や指示が中心で、他メンバーの発言が少ない", score: 0 },
      { text: "意見を求めてもなかなか出てこない", score: 1 },
      { text: "議論は活発だが、長丁場／担当や期限が曖昧になりがち", score: 2 },
      { text: "トップや特定の人の案で決まることが多い", score: 1 },
      { text: "特に問題は感じず、活発に議論できている", score: 3 }, 
      { text: "トラブル等の原因や経緯の追及に時間を費やすことが多い", score: 0 }, 
      { text: "報告だけで終わる／議題なしの定例がある", score: 0 },
    ],
    isMultipleChoice: true,
    progressPercentage: 7.1,
  },
  {
    id: 2,
    questionText: "Q2. 部下からの提案に対して、あなたがよく取る反応は？（単一選択）",
    options: [
      { text: '「いいね！もっと詳しく聞かせてくれる？」', score: 3 },
      { text: '「それ、費用はいくらかかるの？」', score: 1 },
      { text: 'とりあえず「検討しておくよ」と受け止める（行動するかどうかは別）', score: 1 },
      { text: '「今は忙しいからまた後で」', score: 0 },
      { text: '「それは前例がないからダメ」', score: 0 },
      { text: '「それは前にも誰かが言ったけど、うまくいかなかったよ」', score: 0 },
    ],
    isMultipleChoice: false,
    progressPercentage: 14.3,
  },
  {
    id: 3,
    questionText: 'Q3. 意思決定に関して、社内でこんな声が"漏れ聞こえてくる"ことはありませんか？（単一選択）',
    options: [
      { text: 'ウチの社長は決断が早くて助かる', score: 3 },
      { text: '結局、また話が変わった', score: 0 },
      { text: 'あの部門／人は社長に直接つながっているから特別扱いだ', score: 0 },
      { text: '誰が決めるのかわからない／責任の所在があいまいだ', score: 0 },
      { text: '結局根回しなんだよな…', score: 0 },
      { text: '会議中には意見が出ず、終わってから意見や不満がチラホラ', score: 1 },
      { text: '会議の結果が納得できる', score: 3 },
      { text: 'そういう声は特に耳に入ってこない', score: 2 }
    ],
    isMultipleChoice: false,
    progressPercentage: 21.4,
  },
  {
    id: 4,
    questionText: "Q4. 社員との関係について、次のうち当てはまるものをすべて選んでください（複数選択可・最大３つまで）",
    options: [
      { text: '話といえば主に業務連絡で、プライベートな話は出ない', score: 0 },
      { text: 'ミスやトラブル報告が遅れて出てくる', score: 0 },
      { text: 'こちらが聞けば答えるが、社員から話しかけられることは少ない', score: 0 },
      { text: 'すぐに名前が出てこない社員がいる', score: 0 },
      { text: '社員から気軽に声を掛けられる方だと思う', score: 2 },
      { text: '社員の顔と名前は一致しているが深くは知らない', score: 1 },
      { text: '一人ひとりの個性や強みまで把握している', score: 3 },
      { text: '現場の社員たちの声を聴くことは自分にとっていい刺激になっている', score: 3 }
    ],
    isMultipleChoice: true,
    progressPercentage: 28.6,
  },
  {
    id: 5,
    questionText: "Q5. あなたが会社経営で重視していることは？（複数選択可・最大３つまで）",
    options: [
      { text: 'これまでのやり方／前例を大事にしている', score: 0 },
      { text: '最終的には自分の勘で決める', score: 0 },
      { text: '経験や場数', score: 1 },
      { text: 'データや外部環境の変化', score: 3 },
      { text: '現場や若手の声を積極的に取り入れる', score: 3 },
      { text: 'SDGsや社会課題への貢献', score: 2 },
      { text: '多様性や人権意識（ダイバーシティなど）', score: 2 },
      { text: '地域・社会との共生', score: 2 },
      { text: '外部の専門家によるアドバイス', score: 1 }
    ],
    isMultipleChoice: true,
    progressPercentage: 35.7,
  },
  {
    id: 6,
    questionText: "Q6. こんなセリフ、言ったことありませんか？（複数選択可・最大３つまで）",
    options: [
      { text: '昔は○○だった／オレの時代では○○だった', score: 0 },
      { text: '『○○世代は』『女の子は』『男なら』などつい属性でくくってしまう', score: 0 },
      { text: '何でもかんでも変えればいいってもんじゃない', score: 0 },
      { text: '「普通は〜」「常識では〜」という言い回しをよく使う', score: 0 },
      { text: '面白そうだね。まずはそれでいってみよう', score: 3 },
      { text: '責任は私がとるから、自由にやっていいよ', score: 3 },
      { text: 'なるほど、とりあえず話を聞かせてくれ', score: 2 },
      { text: '（新しいことについて）まずは自分でもやってみるよ', score: 3 }
    ],
    isMultipleChoice: true,
    progressPercentage: 42.9,
  },
  {
    id: 7,
    questionText: "Q7. 社内のDXやAI導入へのあなたの姿勢に近いものは？（単一選択）",
    options: [
      { text: '先行導入して小さく回し、現場で運用改善を進めている', score: 3 },
      { text: '計画立案・情報収集中で、PoC/試行の準備をしている', score: 2 },
      { text: '社内に抵抗勢力があり、導入には苦戦中', score: 1 },
      { text: '重要性は理解しているが、他優先で着手できていない', score: 0 },
      { text: '「うちの業界には関係ない」と考えている', score: 0 }
    ],
    isMultipleChoice: false,
    progressPercentage: 50.0
  },
  {
    id: 8,
    questionText: "Q8. 経営判断や指示に関して、社内でこんな声が\"聞こえてきた\"ことはありませんか？（複数選択可・最大３つまで）",
    options: [
      { text: 'また方針転換か…', score: 0 },
      { text: '上は現場のことをわかってないよな', score: 0 },
      { text: 'ちょっと発言しにくい', score: 1 },
      { text: '現場のことも考えてくれてる', score: 3 },
      { text: '指示が明確で迷わず動ける', score: 3 },
      { text: '実際に派遣社員や若手の声もまんべんなく聞こえてくる', score: 3 },
      { text: 'ウチの会社は挑戦しやすい', score: 3 },
      { text: '該当するものはない', score: 0 }
    ],
    isMultipleChoice: true,
    progressPercentage: 57.1
  },
  {
    id: 9,
    questionText: "Q9. 最近、こんな現象はありませんか？（複数選択可・最大３つまで）",
    options: [
      { text: '以前は発言していた社員が、最近あまり発言しなくなった', score: 0 },
      { text: '気にかけていた社員が、何も言わずに辞めていった', score: 0 },
      { text: '最近、中間管理職の元気がないようだ', score: 1 },
      { text: 'アイデアは出るが、実現まで至らないことが多い', score: 2 },
      { text: '若手が会議で積極的に自分の考えを話している', score: 3 },
      { text: '「この会社で挑戦したい」と言ってくれる社員がいる', score: 3 },
      { text: '部門を越えた対話やアイデアの共有が起きている', score: 3 },
      { text: '上司に対しても率直なフィードバックが出てくる空気がある', score: 3 }
    ],
    isMultipleChoice: true,
    progressPercentage: 64.3
  },
  {
    id: 10,
    questionText: "Q10. 変革に対するあなた自身の「変わる覚悟」は？（単一選択）",
    options: [
      { text: 'まず自分が変わる覚悟で行動している／始めている', score: 3 },
      { text: '頭では理解し、部分的に着手しているが継続が課題', score: 2 },
      { text: '変わることは大事だと思うが、今のやり方でも大きな問題は感じていない', score: 1 },
      { text: '必要になったら変わるつもりでいる', score: 0 },
      { text: '世代交代の観点からも、まずは現場主導で変わるのが望ましいと思う', score: 0 },
    ],
    isMultipleChoice: false,
    progressPercentage: 71.4
  },
  {
    id: 11,
    questionText: "Q11. あなたは社員に対して、どのような気持ちで接していますか？（単一選択）",
    options: [
      { text: '正直、もっといい人材が欲しい', score: 0 },
      { text: '働きぶりを常に確認できる仕組みを導入している', score: 0 },
      { text: '新規顧客の開拓は自分（社長）が行わないとうまくいかない', score: 0 },
      { text: '基本的に信用しているが、重要なところは自分が握っている', score: 1 },
      { text: '社員にもよるが、任せられる人には任せている', score: 2 },
      { text: '任せてはいるが、心のどこかで不安を感じている', score: 2 },
      { text: 'うまくいかないことも含めて、社員を信じて任せている', score: 3 }
    ],
    isMultipleChoice: false,
    progressPercentage: 78.6
  },
  {
    id: 12,
    questionText: "Q12. 退職した社員について、こんな傾向ありませんか？（複数選択可・最大３つまで）",
    options: [
      { text: "うちに残ってほしい人ほど、あっさり辞めていく", score: 0 },
      { text: "退職代行を使う社員が出てきた", score: 0 },
      { text: "退職理由は「介護」「出産」「スキルアップ」などが多い", score: 1 },
      { text: "そもそも退職者は滅多にいない", score: 3 },
      { text: "辞める前に、どうにか続けられないかと相談されたことがある", score: 3 },
      { text: "退職後も連絡をくれたり、イベントに顔を出してくれたりする人がいる", score: 2 }, // ← 3→2 に調整
      { text: "退職しても、今も連携して一緒に仕事している人がいる", score: 3 },
    ],
    isMultipleChoice: true,
    progressPercentage: 85.7
  },
  {
    id: 13,
    questionText: "Q13. あなたの会社での意思決定で、当てはまるものを全て選んでください（複数選択可・最大３つまで）",
    options: [
      { text: '合議制はあるが、社長／強い役員が結論を翻すことがある', score: 0 },
      { text: '自分の判断でプロジェクトを止めたり動かしたりすることがある', score: 0 },
      { text: '大きな投資でも相談なく独断で決めることがある', score: 0 },
      { text: '決裁は会議より「根回し」で決まることが多い', score: 1 },
      { text: '最終判断は社長まで上がるが、現場の声も反映される', score: 2 },
      { text: '意思決定はルールとプロセスに基づいて行われている', score: 3 },
      { text: '会議で意見を出し合い、納得した上で合意が形成されている', score: 3 },
      { text: '部署やチームに意思決定を委ねる場面が増えてきた', score: 3 }
    ],
    isMultipleChoice: true,
    progressPercentage: 92.9
  },
 {
    id: 14,
    questionText: "Q14. あなたが不在でも、会社が回る体制になっていますか？（単一選択）",
    options: [
      { text: '現状では、自分抜きではどうにもならない', score: 0 },
      { text: '一応、幹部はいるが最終判断は全部自分がしている', score: 1 },
      { text: '幹部が判断することもあるが、重要案件は自分の承認が必要', score: 2 },
      { text: '信頼できる右腕がいて、ほとんど任せている', score: 2 },
      { text: '自分が不在でも、会社が問題なく回る体制になっている', score: 3 }
    ],
    isMultipleChoice: false,
    progressPercentage: 100.0
  }
];