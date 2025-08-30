// app/consult/booking/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { sendMail } from '@/lib/mail';
import {
  renderConsultIntakeMailToUser,
  renderConsultIntakeMailToOps,
  bookingUrlFor,
  type Consultant as EmailConsultant,
} from '@/lib/emailTemplates';

// env の存在チェック（ローカル関数）
function needEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`[consult/booking] missing env: ${name}`);
  return v;
}

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';
export const preferredRegion = ['hnd1']; // Tokyo(羽田)

// ===== Types =====
type Consultant = 'ishijima' | 'morigami' | 'either';

type TopicKey =
  | 'meeting'       // 会議設計・合意形成
  | 'delegation'    // 権限委譲・リーダー育成
  | 'relations'     // 上下・部門の関係性
  | 'engagement'    // エンゲージメント
  | 'career'        // キャリアサポート
  | 'execCoaching'  // エグゼクティブコーチング
  | 'brain'         // 思考技術・創発風土
  | 'culture'       // 風土改善
  | 'vision'        // 理念・ビジョン
  | 'other';        // 自由記入

// ===== 自動割当（either のときだけ使用） =====
// Ishi: 会議／関係性／脳／権限委譲／エグゼコーチ
const ISHI_SET = new Set<TopicKey>([
  'meeting', 'relations', 'brain', 'delegation', 'execCoaching',
]);
// Mori: エンゲージメント／キャリア／風土改善
const MORI_SET = new Set<TopicKey>([
  'engagement', 'career', 'culture',
]);
// vision は中立（どちらでも可）

function autoAssign(themes: string[]): Consultant {
  // -> Set を配列に変換しておく（downlevelIteration不要にする）
  const picked = Array.from(
    new Set(
      (themes || [])
        .map(s => String(s).trim())
        .filter(Boolean) as TopicKey[]
    )
  );

  if (picked.some(k => MORI_SET.has(k))) return 'morigami';
  if (picked.some(k => ISHI_SET.has(k))) return 'ishijima';
  return 'ishijima'; // デフォルト
}

// ====== Handler ======
export async function POST(req: Request) {
  try {
    // multipart/form-data を受け取る
    const fd = await req.formData();

    // --- 必須 ---
    const name     = String(fd.get('name')  ?? '').trim();
    const email    = String(fd.get('email') ?? '').trim();

    if (!name || !email) {
      return NextResponse.json({ ok: false, error: 'missing name/email' }, { status: 400 });
    }

    // --- 任意（hidden 推奨含む） ---
    const resultId      = String(fd.get('resultId')     ?? '').trim();
    const style         = String(fd.get('style')        ?? '').trim() || null;
    const assigneePref  = (String(fd.get('assigneePref') ?? 'either').trim() || 'either') as Consultant;
    const themes        = fd.getAll('themes').map(v => String(v).trim()).filter(Boolean);
    const note          = String(fd.get('note')         ?? '').trim() || null;

    // 申込者情報（DB保存用）
    const companyName   = String(fd.get('companyName')  ?? '').trim() || null;
    const companySize   = String(fd.get('companySize')  ?? '').trim() || null; // '1-10' など
    const industry      = String(fd.get('industry')     ?? '').trim() || null;
    const ageRange      = String(fd.get('ageRange')     ?? '').trim() || null;

    // either のときだけ自動割当
    const assigned: Consultant =
      assigneePref === 'either' ? autoAssign(themes) : assigneePref;

    // メールテンプレ側の Consultant 型へ（undefined=どちらでも可）
    const consultantForMail: EmailConsultant =
      (assigned === 'either' ? undefined : assigned) as EmailConsultant;

    // ====== DB 保存（best-effort） ======
    try {
      const admin = createClient(
        needEnv('NEXT_PUBLIC_SUPABASE_URL'),
        needEnv('SUPABASE_SERVICE_ROLE_KEY'),
        { auth: { persistSession: false } },
      );

      // consult_intake に保存（存在するカラムだけ使う）
      const intake: Record<string, any> = {
        result_id: resultId || null,
        email, name,
      };
      if (companyName) intake.company_name = companyName;
      if (companySize) intake.company_size = companySize;
      if (industry)    intake.industry     = industry;
      if (ageRange)    intake.age_range    = ageRange;
      if (themes.length) intake.themes     = themes; // text[]/json 想定

      await admin.from('consult_intake').insert(intake);

      // samurairesults にも補完（存在すれば）
      if (resultId) {
        const patch: Record<string, any> = {};
        if (email)       patch.email        = email;
        if (name)        patch.name         = name;
        if (companySize) patch.company_size = companySize;
        await admin.from('samurairesults').update(patch).eq('id', resultId);
      }
    } catch (dbErr) {
      console.error('[consult/booking] supabase save skipped:', dbErr);
      // DB失敗でもメール送信とレスポンスは継続
    }

    // ====== メール送信 ======

    // 1) 申込者へ（予約URLつき）
    const userMail = renderConsultIntakeMailToUser({
      name,
      consultant: consultantForMail,
      resultId: resultId || undefined,
      email,
    });
    await sendMail({
      to: email,
      subject: userMail.subject,
      html: userMail.html,
      text: userMail.text,
    });

    // 2) 運用通知（補足を末尾に添付）
    const opsMail = renderConsultIntakeMailToOps({
      email,
      name,
      companyName: companyName || undefined,
      companySize: (companySize || '1-10') as any,
      industry:    (industry    || 'その他') as any,
      resultId: resultId || undefined,
    });
    await sendMail({
      to: (process.env.MAIL_TO_OPS || 'info@ourdx-mtg.com').trim(),
      subject: opsMail.subject,
      html: `${opsMail.html}
<hr/>
<div style="font-size:12px;color:#666;line-height:1.7">
  <b>style:</b> ${style || '-'}<br/>
  <b>assigneePref:</b> ${assigneePref}<br/>
  <b>assigned:</b> ${assigned}<br/>
  <b>themes:</b> ${themes.join(', ') || '-'}<br/>
  <b>note:</b> ${note || '-'}
</div>`,
      text: opsMail.text,
    });

    // 3) 画面側へ返却（即リダイレクト用 URL も同梱）
    const bookingUrl = bookingUrlFor(consultantForMail, resultId || undefined, email);
    return NextResponse.json({ ok: true, assigned, bookingUrl });
  } catch (e: any) {
    console.error('[api/consult/booking] failed:', e);
    return NextResponse.json({ ok: false, error: e?.message || String(e) }, { status: 500 });
  }
}

// GET等は許可しない（フォームPOST専用）
export async function GET() {
  return NextResponse.json({ ok: false, error: 'method_not_allowed' }, { status: 405 });
}
