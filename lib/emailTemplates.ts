// /lib/emailTemplates.ts
// 目的：consult-intake（無料個別相談）のメール本文/件名を生成
// - 呼び出し側の既存 import 名（buildConsultEmail, renderConsultIntakeMailToUser, renderConsultIntakeMailToOps）をすべて用意
// - 受け取る payload は柔らかく any/Record<string, any> で受ける（既存APIの形の差異に耐える）
// - 宛名は必ず「様」付与
// - 担当者に応じて Spir 予約URLを差し込める（環境変数で設定）

type MailParts = { subject: string; html: string; text: string };

const SITE_NAME = 'IOT（企業の未来づくり研究所）';
const BRAND = '武将タイプ診断';
const SUPPORT = 'support@ourdx-mtg.com'; // 必要なら変更

// 予約URL（未設定時は # を返す）
function getSpirUrl(assignee?: string): string {
  const key = String(assignee ?? 'auto').toLowerCase();
  const byKey: Record<string, string | undefined> = {
    auto: process.env.NEXT_PUBLIC_SPIR_URL_AUTO,
    ishijima: process.env.NEXT_PUBLIC_SPIR_URL_ISHIJIMA,
    morigami: process.env.NEXT_PUBLIC_SPIR_URL_MORIGAMI,
  };
  return byKey[key] || byKey['auto'] || '#';
}

function withSama(name: unknown): string {
  const s = String(name ?? '').trim();
  if (!s) return 'ご担当者様';
  return /様$/.test(s) ? s : s + ' 様';
}

function safe(v: unknown): string {
  const s = String(v ?? '').trim();
  return s || '—';
}

function bullet(list: unknown): string {
  if (Array.isArray(list) && list.length) {
    return list.map((x) => `・${String(x)}`).join('\n');
  }
  return '—';
}

function kvHtml(label: string, value: string) {
  return `<tr><td style="padding:4px 8px;color:#64748b;white-space:nowrap">${label}</td><td style="padding:4px 8px">${value}</td></tr>`;
}

function wrapHtml(inner: string) {
  return `<!doctype html><html><body style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,Meiryo,'Hiragino Kaku Gothic ProN',sans-serif;line-height:1.6;color:#111827">
<div style="max-width:720px;margin:24px auto;padding:16px 20px;border:1px solid #e5e7eb;border-radius:12px">
${inner}
<p style="margin-top:24px;font-size:12px;color:#6b7280">本メールは ${SITE_NAME} の自動送信です。心当たりがない場合はこのメールに返信でお知らせください。</p>
</div></body></html>`;
}

// ===== ユーザー宛て =====
export function renderConsultIntakeMailToUser(payload: Record<string, any>): MailParts {
  const name = withSama(payload?.name ?? payload?.yourName);
  const rid = safe(payload?.rid);
  const assignee = String(payload?.assignee ?? 'auto').toLowerCase();
  const spir = getSpirUrl(assignee);

  const subject = `【${BRAND}】無料個別相談を受け付けました（ID: ${rid}）`;

  const html = wrapHtml(`
<p>${name}</p>
<p>${SITE_NAME} です。無料個別相談のお申込みを受け付けました。担当より内容を確認の上、ご連絡いたします。</p>
<p>早めに日程を確定されたい場合は、以下のボタンからご都合の良い日時をお選びください。</p>
<p style="margin:16px 0"><a href="${spir}" style="display:inline-block;background:#2563eb;color:#fff;padding:12px 18px;border-radius:10px;text-decoration:none">日程を予約する</a></p>
<table style="width:100%;border-collapse:collapse;margin-top:16px;font-size:14px">
${kvHtml('結果ID（rid）', rid)}
${kvHtml('お名前', safe(payload?.name ?? payload?.yourName))}
${kvHtml('メール', safe(payload?.email))}
${kvHtml('会社名', safe(payload?.company))}
${kvHtml('会社規模', safe(payload?.companySize))}
${kvHtml('業種', safe(payload?.industry))}
${kvHtml('年齢', safe(payload?.age))}
${kvHtml('ご相談トピック', bullet(payload?.topics ?? payload?.consultTopics))}
${kvHtml('到達したい状態', bullet(payload?.desiredStates))}
${kvHtml('いまのボトルネック', bullet(payload?.bottlenecks))}
${kvHtml('優先的に取り組みたいテーマ', bullet(payload?.priorityThemes))}
${kvHtml('希望スタイル', safe(payload?.style))}
${kvHtml('担当の希望', safe(payload?.assignee))}
</table>
<p style="margin-top:16px">※このメールにそのまま返信していただいても大丈夫です。</p>
<p style="margin-top:8px;font-size:12px;color:#6b7280">発行：${SITE_NAME}／お問い合わせ：${SUPPORT}</p>
`);

  const text = [
    `${name}`,
    `${SITE_NAME} です。無料個別相談のお申込みを受け付けました。`,
    `▼日程予約リンク`,
    `${spir}`,
    ``,
    `■結果ID: ${rid}`,
    `■お名前: ${safe(payload?.name ?? payload?.yourName)}`,
    `■メール: ${safe(payload?.email)}`,
    `■会社名: ${safe(payload?.company)}`,
    `■会社規模: ${safe(payload?.companySize)}`,
    `■業種: ${safe(payload?.industry)}`,
    `■年齢: ${safe(payload?.age)}`,
    `■ご相談トピック:\n${bullet(payload?.topics ?? payload?.consultTopics)}`,
    `■到達したい状態:\n${bullet(payload?.desiredStates)}`,
    `■いまのボトルネック:\n${bullet(payload?.bottlenecks)}`,
    `■優先的に取り組みたいテーマ:\n${bullet(payload?.priorityThemes)}`,
    `■希望スタイル: ${safe(payload?.style)}`,
    `■担当の希望: ${safe(payload?.assignee)}`,
    ``,
    `このメールに返信でご連絡いただけます（${SUPPORT}）。`,
  ].join('\n');

  return { subject, html, text };
}

// ===== 運用宛て（内部通知） =====
export function renderConsultIntakeMailToOps(payload: Record<string, any>): MailParts {
  const rid = safe(payload?.rid);
  const assignee = String(payload?.assignee ?? 'auto').toLowerCase();
  const spir = getSpirUrl(assignee);

  const subject = `【相談申込】${safe(payload?.name ?? payload?.yourName)}／ID:${rid}`;

  const html = wrapHtml(`
<p>無料個別相談の申込を受け付けました。</p>
<table style="width:100%;border-collapse:collapse;margin-top:8px;font-size:14px">
${kvHtml('結果ID（rid）', rid)}
${kvHtml('氏名', safe(payload?.name ?? payload?.yourName))}
${kvHtml('メール', safe(payload?.email))}
${kvHtml('会社名', safe(payload?.company))}
${kvHtml('会社規模', safe(payload?.companySize))}
${kvHtml('業種', safe(payload?.industry))}
${kvHtml('年齢', safe(payload?.age))}
${kvHtml('担当の希望', safe(payload?.assignee))}
${kvHtml('Spir予約', `<a href="${spir}">${spir}</a>`)}
${kvHtml('ご相談トピック', bullet(payload?.topics ?? payload?.consultTopics))}
${kvHtml('到達したい状態', bullet(payload?.desiredStates))}
${kvHtml('いまのボトルネック', bullet(payload?.bottlenecks))}
${kvHtml('優先テーマ', bullet(payload?.priorityThemes))}
${kvHtml('希望スタイル', safe(payload?.style))}
</table>
<p style="margin-top:12px;color:#6b7280">（この通知は自動送信）</p>
`);

  const text = [
    `無料個別相談 申込を受信`,
    `ID: ${rid}`,
    `氏名: ${safe(payload?.name ?? payload?.yourName)}`,
    `メール: ${safe(payload?.email)}`,
    `会社: ${safe(payload?.company)}`,
    `規模: ${safe(payload?.companySize)}`,
    `業種: ${safe(payload?.industry)}`,
    `年齢: ${safe(payload?.age)}`,
    `担当希望: ${safe(payload?.assignee)}`,
    `Spir: ${spir}`,
    `---`,
    `トピック:\n${bullet(payload?.topics ?? payload?.consultTopics)}`,
    `到達したい状態:\n${bullet(payload?.desiredStates)}`,
    `ボトルネック:\n${bullet(payload?.bottlenecks)}`,
    `優先テーマ:\n${bullet(payload?.priorityThemes)}`,
    `希望スタイル: ${safe(payload?.style)}`,
  ].join('\n');

  return { subject, html, text };
}

// ===== 旧呼び出し互換（buildConsultEmail） =====
// 既存の route が `buildConsultEmail(payload)` を呼んでも動くよう統合して返す
export function buildConsultIntakeEmail(payload: Record<string, any>): {
  user: MailParts;
  ops: MailParts;
} {
  return {
    user: renderConsultIntakeMailToUser(payload),
    ops: renderConsultIntakeMailToOps(payload),
  };
}

// 旧名での export を残す（後方互換）
export const buildConsultEmail = buildConsultIntakeEmail;
