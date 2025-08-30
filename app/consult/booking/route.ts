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
const ISHI_SET = new Set<TopicKey>(['meeting','relations','brain','delegation','execCoaching']);
const MORI_SET = new Set<TopicKey>(['engagement','career','culture']);
// vision は中立（どちらでも可）

function autoAssign(themes: string[]): Consultant {
  const picked = Array.from(
    new Set((themes || []).map(s => String(s).trim()).filter(Boolean) as TopicKey[])
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
    const name  = String(fd.get('name')  ?? '').trim();
    const email = String(fd.get('email') ?? '').trim();
    if (!name || !email) {
      return NextResponse.json({ ok: false, error: 'missing name/email' }, { status: 400 });
    }

    // --- 任意（hidden 推奨含む） ---
    const resultId     = String(fd.get('resultId')     ?? '').trim();
    const style        = String(fd.get('style')        ?? '').trim() || null;
    const assigneePref = (String(fd.get('assigneePref') ?? 'either').trim() || 'either') as Consultant;
    const themes       = fd.getAll('themes').map(v => String(v).trim()).filter(Boolean);
    const note         = String(fd.get('note')         ?? '').trim() || null;

    // 申込者が任意で入れた可能性（今はフォームに出していない想定）
    let companyName = (String(fd.get('companyName') ?? '').trim() || null);
    let companySize = (String(fd.get('companySize') ?? '').trim() || null);
    let industry    = (String(fd.get('industry')    ?? '').trim() || null);
    let ageRange    = (String(fd.get('ageRange')    ?? '').trim() || null);

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

      // --- 足りない会社情報は DB から補完（samurairesults -> consult_intake 最新） ---
      if (resultId && (!companyName || !companySize || !industry || !ageRange)) {
        const { data: srow } = await admin
          .from('samurairesults')
          .select('company_name, company_size, industry, age_range')
          .eq('id', resultId)
          .maybeSingle();

        if (srow) {
          companyName ||= (srow as any).company_name ?? null;
          companySize ||= (srow as any).company_size ?? null;
          industry    ||= (srow as any).industry     ?? null;
          ageRange    ||= (srow as any).age_range    ?? null;
        }

        if (!companyName || !companySize || !industry || !ageRange) {
          const { data: ci } = await admin
            .from('consult_intake')
            .select('company_name, company_size, industry, age_range')
            .eq('result_id', resultId)
            .order('created_at', { ascending: false })
            .limit(1);
          if (ci?.[0]) {
            companyName ||= (ci[0] as any).company_name ?? null;
            companySize ||= (ci[0] as any).company_size ?? null;
            industry    ||= (ci[0] as any).industry     ?? null;
            ageRange    ||= (ci[0] as any).age_range    ?? null;
          }
        }
      }

      // consult_intake に保存（存在するカラムだけ使う/ nullも許容）
      const intake: Record<string, any> = {
        result_id: resultId || null,
        email, name,
        company_name: companyName,
        company_size: companySize,
        industry,
        age_range: ageRange,
        themes: themes.length ? themes : null,
        note,
        style,
        assignee_pref: assigneePref,
        assigned, // 実際に割り当てた担当
      };
      await admin.from('consult_intake').insert(intake);

      // samurairesults にも補完（存在すれば）— null で上書きしないように注意
      if (resultId) {
        const patch: Record<string, any> = {
          is_consult_request: true,
          email,
          name,
        };
        if (companyName !== null) patch.company_name = companyName;
        if (companySize !== null) patch.company_size = companySize;
        if (industry    !== null) patch.industry     = industry;
        if (ageRange    !== null) patch.age_range    = ageRange;

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
