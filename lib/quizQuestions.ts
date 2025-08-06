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
    questionText: "Q1. 会議でこんな光景、見覚えありませんか？（複数選択）",
    options: [
      { text: '自分が話す時間が長く、部下の発言が少ない', score: 0 },
      { text: '意見を求めても、中々出てこない（シーンとしがち）', score: 0 },
      { text: '会議で決めきれず「持ち帰り」が続く', score: 0 },
      { text: '提案は出るが、結局自分の案で決まることが多い', score: 0 },
      { text: '特に問題は感じておらず、活発な議論ができていると思う', score: 3 },
      { text: '会議の場が"責任追及の場"になりがち', score: 0 },
      { text: '会議では何も決まらず、報告だけで終わることが多い', score: 0 },
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
      { text: '「わかった。検討しておくよ（でも結局何もしない）」', score: 1 },
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
      { text: '「社長がYESなら即決。ウチは判断早くて助かる」って言われる', score: 3 },
      { text: '「結局、また話が変わった」ってボヤかれていた', score: 0 },
      { text: '「あの部門は社長に直接つながってるから特別扱い」って言われたことがある', score: 0 },
      { text: '「誰が決めるのかわからない」「責任の所在があいまい」って言われる', score: 0 },
      { text: 'そういう"声"は特に耳に入ってこない', score: 2 },
    ],
    isMultipleChoice: false,
    progressPercentage: 21.4,
  },
  {
    id: 4,
    questionText: "Q4. 社員との関係について、次のうち当てはまるものをすべて選んでください（複数選択）",
    options: [
      { text: '話といえば主に業務連絡で、プライベートな話は出ない', score: 0 },
      { text: 'ミスやトラブル報告が遅れて出てくる', score: 0 },
      { text: 'こちらが聞けば答えるが、あえて社員から話しかけられることはない', score: 0 },
      { text: '面談でも無難な会話が多いのは、昨今の事情から仕方ないと思っている', score: 0 },
      { text: '実は顔と名前が一致していない社員がいる', score: 0 },
      { text: '社員から割と気軽に声を掛けられる方だと思う', score: 2 },
      { text: '社員の顔と名前は一致しているが深くは知らない', score: 1 },
      { text: '一人ひとりの個性や強みまで把握している', score: 3 },
    ],
    isMultipleChoice: true,
    progressPercentage: 28.6,
  },
  {
    id: 5,
    questionText: "Q5. あなたが会社経営で重視していることは？（複数回答可）",
    options: [
      { text: '過去の成功体験', score: 0 },
      { text: '自分の勘や直感', score: 0 },
      { text: '経験や場数', score: 1 },
      { text: 'データや外部環境の変化', score: 3 },
      { text: '現場や若手の声', score: 3 },
      { text: 'SDGsや社会課題への貢献', score: 2 },
      { text: '多様性や人権意識（ダイバーシティなど）', score: 2 },
      { text: '地域・社会との共生', score: 2 },
      { text: '外部の専門家によるアドバイス', score: 1 },
    ],
    isMultipleChoice: true,
    progressPercentage: 35.7,
  },
  {
    id: 6,
    questionText: "Q6. こんなセリフ、言ったことありませんか？（複数選択）",
    options: [
      { text: '昔は○○だった／オレの時代では○○だった', score: 0 },
      { text: '何かと「○○世代」「女の子」「男なら」など属性でくくりがち', score: 0 },
      { text: '何でもかんでも変えればいいってもんじゃない', score: 0 },
      { text: '「普通は～」「常識では～」のような言い回しをよく使う', score: 0 },
      { text: '面白そうだね。まずやってみよう！', score: 3 },
      { text: '責任は私がとるから、自由にやってくれ', score: 3 },
      { text: 'なるほど、とりあえず話を聞かせてくれ', score: 2 },
    ],
    isMultipleChoice: true,
    progressPercentage: 42.9,
  },
  {
    id: 7,
    questionText: "Q7. 社内のDXやAI導入へのあなたの姿勢に近いものは？（単一選択）",
    options: [
      { text: '自ら推進している', score: 3 },
      { text: '詳しくないが、部下に任せている', score: 2 },
      { text: '正直よくわからない', score: 1 },
      { text: '自分には関係ないと思っている', score: 0 },
      { text: '導入しているが、活用されていない', score: 1 }
    ],
    isMultipleChoice: false,
    progressPercentage: 50.0
  },
  {
    id: 8,
    questionText: "Q8. 経営判断や指示に関して、社内でこんな声が\"聞こえてきた\"ことはありませんか？（複数選択）",
    options: [
      { text: "また方針転換か…", score: 0 },
      { text: "上は現場のことをわかってないよな", score: 0 },
      { text: "結局、現場にしわ寄せがくるんだよな…", score: 0 },
      { text: "『自分で考えろ』と言われるが、勝手に決めると怒られる", score: 0 },
      { text: "ウチの社長は決断が早くていいよね", score: 3 },
      { text: "現場のことも考えてくれてる", score: 3 },
      { text: "指示が明確で迷わず動ける", score: 3 },
      { text: "上下関係なく発言しやすい", score: 3 },
      { text: "ウチの会社は挑戦しやすい", score: 3 },
      { text: "該当するものはない", score: 0 }
    ],
    isMultipleChoice: true,
    progressPercentage: 57.1
  },
  {
    id: 9,
    questionText: "Q9. 最近、こんな現象はありませんか？（複数選択）",
    options: [
      { text: '昔はよく意見していた社員が、最近あまり発言しなくなった', score: 0 },
      { text: '面白いアイデアを出してた若手が、静かになってきた', score: 0 },
      { text: '気にかけていた社員が、何も言わずに辞めていった', score: 0 },
      { text: '中堅社員から意見や提案が上がらなくなってきた', score: 0 },
      { text: '若手が会議で積極的に自分の考えを話している', score: 3 },
      { text: '「この会社で挑戦したい」と言ってくれる社員がいる', score: 3 },
      { text: '部門を越えた対話やアイデアの共有が起きているようだ', score: 3 },
      { text: '上司に対しても率直なフィードバックが出てくる空気がある', score: 3 }
    ],
    isMultipleChoice: true,
    progressPercentage: 64.3
  },
  {
    id: 10,
    questionText: "Q10. あなた自身の「変わる覚悟」についてどう思いますか？（単一選択）",
    options: [
      { text: '常に変わり続ける覚悟を持っている', score: 3 },
      { text: '頭ではわかっているけど、なかなか行動できていない', score: 2 },
      { text: '変わることは大事だと思うが、今のやり方でも大きな問題は感じていない', score: 1 },
      { text: '自分が変わらないと会社が変われないとは思っていない', score: 0 },
      { text: '自分ではなく、部下が変わるべきだと思う', score: 0 }
    ],
    isMultipleChoice: false,
    progressPercentage: 71.4
  },
  {
    id: 11,
    questionText: "Q11. あなたは社員に対して、どのような気持ちで接していますか？（単一選択）",
    options: [
      { text: '正直、もっといい人材が欲しい', score: 0 },
      { text: '働きぶりが確認できるよう（操作ログやWebカメラなど）仕組み化している', score: 0 },
      { text: '基本的に信用しているが、最終的には自分で確認してしまう', score: 1 },
      { text: '社員にもよるが、任せられる人は任せている', score: 2 },
      { text: 'うまくいかないことも含めて、社員を信じて任せている', score: 3 }
    ],
    isMultipleChoice: false,
    progressPercentage: 78.6
  },
  {
    id: 12,
    questionText: "Q12. 退職した社員について、こんな傾向ありませんか？（複数選択）",
    options: [
      { text: '理由は「介護」「出産」「スキルアップ」など無難な説明が多い', score: 0 },
      { text: 'うちに残ってほしい人ほど、あっさり辞めていく', score: 0 },
      { text: '辞める前に相談されたことがない（あるいは相談が形だけ）', score: 0 },
      { text: '退職代行を使う社員が出てきた', score: 0 },
      { text: '退職理由をきちんと伝えてくれた', score: 3 },
      { text: '辞める前に、どうにか続けられないかと相談されたことがある', score: 3 },
      { text: '退職後も連絡をくれたり、イベントに顔を出してくれたりする人がいる', score: 3 },
      { text: '退職しても、今も連携して一緒に仕事している人がいる', score: 3 }
    ],
    isMultipleChoice: true,
    progressPercentage: 85.7
  },
  {
    id: 13,
    questionText: "Q13. あなたの会社での意思決定で、当てはまるものを全て選んでください（複数選択）",
    options: [
      { text: '幹部会や合議制はあるが、社長（または力の強い役員）の一声でひっくり返る', score: 0 },
      { text: '自分の気持ちでプロジェクトを止めたり動かしたりすることがある', score: 0 },
      { text: '自分が目をかけている社員には、特別な裁量や昇進を与えている', score: 0 },
      { text: '金額が大きな投資でも、相談なく独断で決めることがある', score: 0 },
      { text: '決裁は会議より「根回し」で決まることが多い', score: 1 },
      { text: '結局、最終判断は全部社長まで上がってくる', score: 1 },
      { text: '意思決定はルールとプロセスに基づいて行われている', score: 3 },
      { text: '会議で意見を出し合い、納得した上で合意が形成されている', score: 3 },
      { text: '誰がどう決めたのかが明確で、現場でも理解されている', score: 3 },
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
      { text: '信頼できる右腕がいて、ある程度任せている', score: 2 },
      { text: '後継者や幹部達だけでもビジネスは回るようになっている', score: 3 }
    ],
    isMultipleChoice: false,
    progressPercentage: 100.0
  }
];