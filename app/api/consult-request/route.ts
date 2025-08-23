// app/api/consult-request/route.ts
import { NextResponse } from 'next/server';
import { z } from 'zod';
import { sendMail } from '@/lib/mail';

const Schema = z.object({
  // 送信者
  email: z.string().email(),
  name: z.string().min(1),
  companyName: z.string().optional(),
  companySize: z.string().optional(),
  resultId: z.string().optional(),

  // フォーム回答（名前はあなたの実装に合わせて調整OK）
  themes: z.array(z.string()).optional(),     // 優先テーマ（複数）
  style: z.array(z.string()).optional(),      // 希望スタイルなど
  note: z.string().optional(),                // 自由記入
  // 担当の希望: 'either' | 'ishijima' | 'morigami'
  assigneePref: z.enum(['either','ishijima','morigami']).default('either'),
});

type Payload = z.infer<typeof Schema>;

function autoRoute(themes: string[] = []): 'ishijima' | 'morigami' {
  const toMori = ['エンゲージメント','1on1','コミュニケーション','人材育成','キャリア','心理的安全性','風土','関係性'];
  const toIshi = ['戦略','仕組み','業務設計','採用','評価','KPI','OKR','組織設計','プロセス'];
  const has = (keys: string[]) => themes.some(t => keys.some(k => t.includes(k)));
  if (has(toMori)) return 'morigami';
  if (has(toIshi)) return 'ishijima';
  return 'morigami'; // デフォルト（どちらでも良ければ森上に）
}

const SPIR_ISHIJIMA = process.env.SPIR_ISHIJIMA_URL!;
const SPIR_MORIGAMI = process.env.SPIR_MORIGAMI_URL!;
const MAIL_TO_OPS   = process.env.MAIL_TO_TEST || process.env.MAIL_REPLY_TO || 'info@ourdx-mtg.com';
const BASE_URL      = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const data = Schema.parse(json);

    const assigned: 'ishijima'|'morigami' =
      data.assigneePref !== 'either' ? data.assigneePref : autoRoute(data.themes);

    const bookingUrl = assigned === 'ishijima' ? SPIR_ISHIJIMA : SPIR_MORIGAMI;

    // --- 申込者向けメール（予約リンクつき） ---
    const subjectUser = '【IOT】無料相談のお申込みを受付けました（予約リンクのご案内）';
    const reportUrl = data.resultId ? `${BASE_URL}/report?resultId=${data.resultId}` : `${BASE_URL}/report`;
    const consultant = assigned === 'ishijima' ? '石島 幸子' : '森上 博司';

    const htmlUser = `
      <p>${data.name} 様</p>
      <p>無料相談のお申込みをありがとうございます。下記よりご都合の良い時間をご予約ください。</p>
      <p><strong>担当（予定）：${consultant}</strong></p>
      <p><a href="${bookingUrl}" target="_blank" rel="noopener"
         style="display:inline-block;padding:12px 18px;background:#0ea5e9;color:#fff;text-decoration:none;border-radius:8px;font-weight:700;">
         相談の日時を予約する
      </a></p>
      <p style="font-size:13px;color:#444;">予約URL：<a href="${bookingUrl}" target="_blank" rel="noopener">${bookingUrl}</a></p>
      <hr style="margin:18px 0;border:none;border-top:1px solid #eee;">
      <p style="font-size:13px;color:#444;">参考：診断レポートはこちら → <a href="${reportUrl}" target="_blank" rel="noopener">${reportUrl}</a></p>
      <p style="font-size:12px;color:#666;margin-top:14px;">※このメールに返信いただいても大丈夫です（返信先：${process.env.MAIL_REPLY_TO || 'info@ourdx-mtg.com'}）。</p>
    `.trim();

    const textUser =
`無料相談のお申込みをありがとうございます。
下記よりご都合の良い時間をご予約ください。

担当（予定）：${consultant}
予約URL：${bookingUrl}

参考：診断レポート
${reportUrl}
`;

    await sendMail({
      to: data.email,
      subject: subjectUser,
      html: htmlUser,
      text: textUser,
    });

    // --- 運用宛（社内通知） ---
    const subjectOps = '【新規 相談申込】自動受付';
    const htmlOps = `
      <h3>新しい無料相談申込</h3>
      <ul>
        <li>氏名：${data.name}</li>
        <li>メール：${data.email}</li>
        <li>会社：${data.companyName || '-'}</li>
        <li>規模：${data.companySize || '-'}</li>
        <li>結果ID：${data.resultId || '-'}</li>
        <li>希望担当：${data.assigneePref}</li>
        <li>自動判定担当：${assigned}</li>
        <li>予約リンク：${bookingUrl}</li>
      </ul>
      <p><strong>テーマ：</strong>${(data.themes||[]).join(' / ') || '-'}</p>
      <p><strong>スタイル：</strong>${(data.style||[]).join(' / ') || '-'}</p>
      <p><strong>メモ：</strong><br>${(data.note||'').replace(/\n/g,'<br>') || '-'}</p>
    `.trim();

    await sendMail({
      to: MAIL_TO_OPS!,
      subject: subjectOps,
      html: htmlOps,
      text: htmlOps.replace(/<[^>]+>/g,''),
    });

    return NextResponse.json({ ok: true, assignedTo: assigned, bookingUrl });
  } catch (e: any) {
    console.error(e);
    return NextResponse.json({ ok:false, error: e?.message || 'BAD_REQUEST' }, { status: 400 });
  }
}
