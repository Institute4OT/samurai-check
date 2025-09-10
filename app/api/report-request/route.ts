// /app/api/report-request/route.ts
// ============================================================
// 「武将タイプ診断」詳細レポート送信API（最終版・エラー解消）
// - POST: { diagId: string(UUID) }
// - Supabaseから診断レコード取得 → emailTemplate生成 → Resend送信
// - ?dry=1 でドライラン（送信しない）
// ============================================================

export const runtime = 'nodejs'; // ★ ResendはNodeランタイム推奨

import { NextResponse, NextRequest } from 'next/server';
import { z } from 'zod';
import { createClient } from '@supabase/supabase-js';
import { buildReportEmail } from '@/lib/emailTemplates'; // ← プロジェクトの実ファイル名/パスに合わせて
import sendMail from '@/lib/mail';

// ---------- 環境変数 ----------
const PUBLIC_BASE_URL =
  process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000';

const OPENCHAT_URL = process.env.NEXT_PUBLIC_OPENCHAT_URL || '';
const OPENCHAT_QR = process.env.NEXT_PUBLIC_OPENCHAT_QR || '';
const SHARE_URL = process.env.NEXT_PUBLIC_SHARE_URL || '';
const CONSULT_URL = process.env.NEXT_PUBLIC_CONSULT_URL || '';
const MAIL_REPLY_TO = process.env.MAIL_REPLY_TO || undefined;

// Supabase（読み取りのみなら ANON でOK）
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

if (!SUPABASE_URL || !SUPABASE_ANON) {
  console.warn(
    '[report-request] NEXT_PUBLIC_SUPABASE_URL / ANON_KEY が未設定です'
  );
}

// ---------- 入力スキーマ ----------
const BodySchema = z.object({
  diagId: z.string().uuid(),
});

// ---------- 便利レスポンス ----------
const ok = (json: any, status = 200) =>
  NextResponse.json(json, { status });
const bad = (msg: string, status = 400) =>
  NextResponse.json({ ok: false, error: msg }, { status });

// ---------- ハンドラ ----------
export async function POST(req: NextRequest) {
  const dryRun = req.nextUrl.searchParams.get('dry') === '1';

  // 入力パース
  let payload: z.infer<typeof BodySchema>;
  try {
    const json = await req.json();
    payload = BodySchema.parse(json);
  } catch {
    return bad('Bad Request: diagId(uuid) が必要です', 400);
  }

  // Supabase クライアント（型ジェネリクスは未使用なので外す）
  const supabase = createClient(SUPABASE_URL, SUPABASE_ANON, {
    global: { headers: { 'x-application-name': 'samurai-check' } },
  });

  // 診断レコード取得（実テーブル/カラム名に合わせてください）
  const { data, error } = await supabase
    .from('diagnoses')
    .select('id, email, company_size, samurai_type, normalized_scores')
    .eq('id', payload.diagId)
    .limit(1)
    .maybeSingle();

  if (error) {
    console.error('[report-request] supabase error:', error);
    return bad('Not Found: DB error', 500);
  }
  if (!data) return bad('Not Found: diagnosis not found', 404);
  if (!data.email) return bad('Record has no email', 422);

  const userName = data.email.split('@')[0];
  const reportLink = `${PUBLIC_BASE_URL}/report/${data.id}`;

  // メール本文生成（件名/HTML/Text/リンク類はテンプレ側で整備済み）
  const mail = buildReportEmail({
    userName,
    samuraiType: data.samurai_type || undefined,
    companySize: data.company_size || 'unknown',
    reportLink,
    consultLink: CONSULT_URL || undefined,
    shareLink: SHARE_URL || undefined,
    openChatLink: OPENCHAT_URL || undefined,
    openChatQrSrc: OPENCHAT_QR || undefined,
    utm: { source: 'email', medium: 'diagnosis', campaign: 'report' },
    diagId: data.id,
  });

  // 送信スキップ（ドライラン）
  if (dryRun) {
    return ok({
      ok: true,
      dryRun: true,
      to: data.email,
      subject: mail.subject,
      preview: mail.text?.slice(0, 120) ?? '',
      reportLink,
    });
  }

  // 送信（★ replyTo プロパティ名に注意。ハイフンは不可）
  try {
    await sendMail({
      to: data.email,
      subject: mail.subject,
      html: mail.html,
      text: mail.text,
      replyTo: MAIL_REPLY_TO, // ← OK（/lib/mailer.ts が reply_to に変換）
      tagId: data.id,
    });
  } catch (e: any) {
    console.error('[report-request] sendMail error:', e);
    return bad(`Send failed: ${e?.message || String(e)}`, 502);
  }

  return ok({ ok: true });
}

export async function OPTIONS() {
  return ok({ ok: true });
}
