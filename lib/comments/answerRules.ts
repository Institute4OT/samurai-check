// lib/comments/answerRules.ts
export type Category = "talent" | "challenge";
export type CommentItem = { key: string; category: Category; text: string; weight: number };
export type AnswerRule = { q: number; includes: string | RegExp; emit: CommentItem[] };

/**
 * 使い方：
 * - 回答（selectedText）に includes が部分一致すれば、その emit コメント候補を追加
 * - weight が高いものから採用。最終的に talents/challenges を各2件まで表示
 * - テキスト微修正にも耐えるよう、長い文は“特徴語”でマッチさせています
 */
export const answerRules: AnswerRule[] = [
  // ---------------- Q1 会議の光景（複数） ----------------
  {
    q: 1,
    includes: /自分が話す時間が長|発言が少ない|意見を求めても.*出てこない/,
    emit: [
      { key: "q1_speak_dom_chal", category: "challenge", text: "発言量の偏りは、発言しない人のモチベーション低下、思考力低下を招きます。“全員の一次声”を引き出す工夫を。", weight: 90 },
    ]
  },
  {
    q: 1,
    includes: /決めきれず.*持ち帰り|何も決まらず.*報告だけ/,
    emit: [
      { key: "q1_no_decision_chal", category: "challenge", text: "会議は“決定の場”に。目的区分（共有/討議/決定）と責任者・期限・合意条件を事前明記すると決め切れます。", weight: 92 },
    ]
  },
  {
    q: 1,
    includes: /責任追及の場/,
    emit: [
      { key: "q1_blame_chal", category: "challenge", text: "心理的安全性が低下。事実→原因→学び→次の打ち手の順に“非難なき振り返り”を定着させましょう。", weight: 88 },
    ]
  },
  {
    q: 1,
    includes: /提案は出るが.*自分の案で決まる/,
    emit: [
      { key: "q1_topdown_chal", category: "challenge", text: "提案採択の公平性を可視化。意思決定の質を上げるには、参加者全員の納得感を上げる工夫を。", weight: 86 },
    ]
  },
  {
    q: 1,
    includes: /活発な議論ができている/,
    emit: [
      { key: "q1_active_talent", category: "talent", text: "活発な対話基盤は強み。意思決定の質をさらに高めるには“反対意見の招待”を意識すると効果的です。", weight: 70 },
    ]
  },

  // ---------------- Q2 提案への反応（単一） ----------------
  {
    q: 2,
    includes: /いいね.*詳しく聞かせて/,
    emit: [
      { key: "q2_coach_talent", category: "talent", text: "探索を促すコーチング的反応ができています。問いで深掘りし、当事者性を高められます。", weight: 95 },
      { key: "q2_coach_chal",   category: "challenge", text: "“誰が・いつまでに・成功基準”をその場で合意し、前進の再現性を上げましょう。", weight: 65 },
    ]
  },
  {
    q: 2,
    includes: /費用はいくら|検討しておくよ/,
    emit: [
      { key: "q2_cost_only_chal", category: "challenge", text: "費用先行や先送りは停滞に繋がりがち。効果仮説→最小実験→費用上限で意思決定を簡素化しましょう。", weight: 88 },
    ]
  },
  {
    q: 2,
    includes: /忙しいからまた後で|前例がない|前にも.*うまくいかなかった/,
    emit: [
      { key: "q2_blocker_chal", category: "challenge", text: "相手のやる気を削いでしまう傾向あり。“止める理由”より“試す条件”を先に定義する会話へ転換しましょう。", weight: 90 },
    ]
  },

  // ---------------- Q3 意思決定に関する声（単一） ----------------
  {
    q: 3,
    includes: /決断が早くて助かる|会議の結果が納得できる/,
    emit: [
      { key: "q3_decisive_talent", category: "talent", text: "迅速さや納得感が評価されています。根拠と判断基準の共有を続け、暗黙知を形式知化しましょう。", weight: 85 },
    ]
  },
  {
    q: 3,
    includes: /また話が変わった|特別扱い|誰が決めるのかわからない|根回し/,
    emit: [
      { key: "q3_fairness_chal", category: "challenge", text: "公平性とプロセスの不透明さに危険信号。決裁ルール・権限表・議事記録の公開で信頼を回復できます。", weight: 93 },
    ]
  },
  {
    q: 3,
    includes: /耳に入ってこない/,
    emit: [
      { key: "q3_no_voice_chal", category: "challenge", text: "組織の声の収集チャンネルを増やすと兆候を早期検知できます（匿名パルスサーベイ等）。", weight: 70 },
    ]
  },

  // ---------------- Q4 社員との関係（複数） ----------------
  {
    q: 4,
    includes: /業務連絡.*プライベート.*出ない|報告が遅れて|話しかけられることは少ない|名前が出てこない/,
    emit: [
      { key: "q4_distance_chal", category: "challenge", text: "距離感が少し遠いサイン。まずは“挨拶＋αの声掛け”で心理的距離を縮めていきましょう。", weight: 90 },
    ]
  },
  {
    q: 4,
    includes: /気軽に声を掛けられる|個性や強みまで把握|いい刺激になっている/,
    emit: [
      { key: "q4_closeness_talent", category: "talent", text: "現場と良い関係性を築けています。強みの言語化と配置で成果に直結させましょう。", weight: 88 },
    ]
  },
  {
    q: 4,
    includes: /顔と名前は一致しているが深くは知らない/,
    emit: [
      { key: "q4_shallow_chal", category: "challenge", text: "社員のパフォーマンスを最大化するには、“強み・価値観・動機”の理解が第一歩です。", weight: 78 },
    ]
  },

  // ---------------- Q5 経営で重視（複数） ----------------
  {
    q: 5,
    includes: /データ|外部環境|若手の声|SDGs|多様性|人権|地域・社会|共生/,
    emit: [
      { key: "q5_modern_talent", category: "talent", text: "外部視点と多様性を取り込めています。意思決定に“仮説とデータ”を組み合わせる姿勢は強みです。", weight: 85 },
    ]
  },
  {
    q: 5,
    includes: /昔のやり方|勘で決める/,
    emit: [
      { key: "q5_old_way_chal", category: "challenge", text: "経験は財産。ただし“勘の根拠”を可視化し、データで補強する設計に更新しましょう。", weight: 90 },
    ]
  },
  {
    q: 5,
    includes: /外部の専門家/,
    emit: [
      { key: "q5_advisor_talent", category: "talent", text: "外部知を取り込める開放性があります。意思決定の質を高める参謀の使い方が上手です。", weight: 70 },
    ]
  },
  {
    q: 5,
    includes: /経験や場数/,
    emit: [
      { key: "q5_experience_talent", category: "talent", text: "豊富な経験は強み。経験則を“原則”として明文化し、次世代に継承しましょう。", weight: 68 },
    ]
  },

  // ---------------- Q6 セリフ（複数） ----------------
  {
    q: 6,
    includes: /面白そうだね|責任は私がとる|話を聞かせてくれ|自分でもやってみる/,
    emit: [
      { key: "q6_growth_talent", category: "talent", text: "試す文化をドライブする言動です。小さな成功を称賛し、挑戦の連鎖を生み出せます。", weight: 95 },
    ]
  },
  {
    q: 6,
    includes: /昔は|世代|女の子|男なら|変えればいい.*もんじゃない|普通は|常識では/,
    emit: [
      { key: "q6_fixed_chal", category: "challenge", text: "思考硬直化の兆し。事例の更新と“例外探索”で思考の柔軟性を取り戻しましょう。", weight: 90 },
    ]
  },

  // ---------------- Q7 DX/AI姿勢（単一） ----------------
  {
    q: 7,
    includes: /先行導入して小さく回し/,
    emit: [
      { key: "q7_pilot_talent", category: "talent", text: "実験志向が根付いています。現場の声を広く集めながら改善・成長へ。", weight: 92 },
    ]
  },
  { q: 7, includes: /計画立案・情報収集中/, emit: [
      { key: "q7_plan_talent", category: "talent", text: "仮説と情報の土台ができています。小さな検証の評価基準と期限を明確に。", weight: 80 },
    ]},
  { q: 7, includes: /抵抗勢力|苦戦中/, emit: [
      { key: "q7_resist_chal", category: "challenge", text: "利害と不安の分解が鍵。ステークホルダーマップで“誰に何を”を設計しましょう。", weight: 90 },
    ]},
  { q: 7, includes: /他優先で着手できていない/, emit: [
      { key: "q7_noaction_chal", category: "challenge", text: "“2週間・低コスト・可逆”の実験を1つ決め、最初の一歩を。", weight: 88 },
    ]},
  { q: 7, includes: /関係ない/, emit: [
      { key: "q7_denial_chal", category: "challenge", text: "同業のミニ事例提示で認識を更新。1工程だけ効果検証から始めましょう。", weight: 95 },
    ]},

  // ---------------- Q8 “聞こえてきた”声（複数） ----------------
  { q: 8, includes: /方針転換|現場のことをわかってない|発言しにくい/, emit: [
      { key: "q8_noise_chal", category: "challenge", text: "一貫性と発言安全性の不足。方針の“Why”共有と発言ルールで改善できます。", weight: 90 },
    ]},
  { q: 8, includes: /現場のことも考えて|指示が明確|派遣社員や若手|挑戦しやすい/, emit: [
      { key: "q8_clarity_talent", category: "talent", text: "現場配慮と明確指示で動ける組織です。挑戦が生まれる制度を強化しましょう。", weight: 88 },
    ]},
  { q: 8, includes: /該当するものはない/, emit: [
      { key: "q8_silence_chal", category: "challenge", text: "声が拾えていない可能性。匿名パルス・窓口の多重化で実態把握を。", weight: 70 },
    ]},

  // ---------------- Q9 最近の現象（複数） ----------------
  { q: 9, includes: /発言しなくなった|何も言わずに辞めていった|中間管理職.*元気がない|実現まで至らない/, emit: [
      { key: "q9_retreat_chal", category: "challenge", text: "離反・停滞のシグナル。心理的安全性と“実行の仕組み”を見直しましょう。", weight: 92 },
    ]},
  { q: 9, includes: /若手が.*積極|挑戦したい|部門を越えた対話|率直なフィードバック/, emit: [
      { key: "q9_engage_talent", category: "talent", text: "自律と越境が起きています。称賛と共有で良い事例を横展開しましょう。", weight: 90 },
    ]},

  // ---------------- Q10 覚悟（単一） ----------------
  { q: 10, includes: /自分が変わる覚悟/, emit: [
      { key: "q10_owner_talent", category: "talent", text: "経営者が先頭に立つ力が強み。仕組み化と権限設計で組織学習へ。", weight: 95 },
    ]},
  { q: 10, includes: /部分的に着手|継続が課題/, emit: [
      { key: "q10_partial_chal", category: "challenge", text: "継続の環境づくりが鍵。週次レビューと伴走者を決めて前進を固定化。", weight: 85 },
    ]},
  { q: 10, includes: /大きな問題は感じていない/, emit: [
      { key: "q10_noissue_chal", category: "challenge", text: "“将来逆算KPI”で潜在損失を可視化し、危機感を適正化しましょう。", weight: 88 },
    ]},
  { q: 10, includes: /必要になったら変わる/, emit: [
      { key: "q10_postpone_chal", category: "challenge", text: "必要前に試す最小実験を先置き。期日と判定基準を先に決めるのがコツ。", weight: 90 },
    ]},
  { q: 10, includes: /現場主導で変わるのが望ましい/, emit: [
      { key: "q10_delegate_chal", category: "challenge", text: "現場自律を活かす枠組み（権限範囲・意思決定ルール・共通指標）を構築しましょう。", weight: 92 },
    ]},

  // ---------------- Q11 社員へのスタンス（単一） ----------------
  { q: 11, includes: /もっといい人材が欲しい|監視できる仕組み|新規顧客.*自分が行わないと/, emit: [
      { key: "q11_control_chal", category: "challenge", text: "コントロール志向が強め。信頼設計と役割の定義で委任の質を高めましょう。", weight: 92 },
    ]},
  { q: 11, includes: /重要なところは自分が握っている|任せられる人には任せている|不安を感じている/, emit: [
      { key: "q11_partial_talent", category: "talent", text: "部分的な委任ができています。決裁基準と情報可視化でさらに任せやすく。", weight: 80 },
    ]},
  { q: 11, includes: /社員を信じて任せている/, emit: [
      { key: "q11_trust_talent", category: "talent", text: "高い信頼文化は強み。失敗からの学習を賞賛し、挑戦の総量を増やしましょう。", weight: 90 },
    ]},

  // ---------------- Q12 退職傾向（複数） ----------------
  { q: 12, includes: /残ってほしい人ほど.*辞めていく|相談されたことがない|退職代行/, emit: [
      { key: "q12_exit_chal", category: "challenge", text: "離職の前兆を掴めていない可能性。“早期シグナル”をキャッチする工夫を。", weight: 93 },
    ]},
  { q: 12, includes: /退職理由は.*スキルアップ|介護|出産/, emit: [
      { key: "q12_reason_chal", category: "challenge", text: "制度・柔軟性の余地あり。両立支援や成長設計で“辞めない選択肢”を増やしましょう。", weight: 85 },
    ]},
  { q: 12, includes: /退職者は滅多にいない|辞める前に.*相談された|連絡をくれたり|今も連携して一緒に/, emit: [
      { key: "q12_alumni_talent", category: "talent", text: "関係資本が強い組織です。OB/OGネットワークで協業機会を拡げましょう。", weight: 90 },
    ]},

  // ---------------- Q13 意思決定の実態（複数） ----------------
  { q: 13, includes: /翻す|独断|根回し|止めたり動かしたり/, emit: [
      { key: "q13_overrule_chal", category: "challenge", text: "意思決定のブラックボックス化は社員のモチベーション低下の元凶に。“納得のルール”を。", weight: 93 },
    ]},
  { q: 13, includes: /現場の声も反映される|ルールとプロセス|合意が形成|委ねる場面が増えてきた/, emit: [
      { key: "q13_process_talent", category: "talent", text: "プロセス型の意思決定が根付きつつあります。権限移譲とKPI連動で強化を。", weight: 90 },
    ]},

  // ---------------- Q14 不在でも回る体制（単一） ----------------
  { q: 14, includes: /不在でも.*回る体制|右腕がいて.*任せている/, emit: [
      { key: "q14_org_talent", category: "talent", text: "仕組みと人材が機能。権限委譲マトリクスと後継育成で持続性を高めましょう。", weight: 92 },
    ]},
  { q: 14, includes: /自分抜きではどうにも|最終判断は全部自分|承認が必要/, emit: [
      { key: "q14_single_point_chal", category: "challenge", text: "トップに一極集中の兆し。権限設計を標準化し“自分不在でも回る”へ。", weight: 94 },
    ]},
];
