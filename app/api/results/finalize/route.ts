// app/api/results/finalize/route.ts
// 診断完了時：DBにスナップショットを「なければ作成」「あれば未確定分のみ更新」

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { normalizeCats } from '@/lib/scoreSnapshot';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function needEnv(name: string) {
  const v = process.env[name];
  if (!v) throw new Error(`[finalize] missing env: ${name}`);
  return v;
}

const supabase = createClient(
  needEnv('NEXT_PUBLIC_SUPABASE_URL'),
  needEnv('SUPABASE_SERVICE_ROLE_KEY'),
  { auth: { persistSession: false } },
);

export async function POST(req: Request) {
  try {
    const json = await req.json().catch(() => ({}));
    const rid: string = String(json?.rid || '').trim();
    const samuraiTypeKey: string | null = json?.samuraiTypeKey ?? null;
    const samuraiTypeJa:  string | null = json?.samuraiTypeJa  ?? null;
    const categories: Array<{ key: string; score: number }> = Array.isArray(json?.categories) ? json.categories : [];

    if (!rid || !categories.length || (!samuraiTypeKey && !samuraiTypeJa)) {
      return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 });
    }

    // 0〜3固定順に正規化
    const cats = normalizeCats(categories);
    const now = new Date().toISOString();

    // 1) 既存行を取得
    const { data: row, error: selErr } = await supabase
      .from('samurairesults')
      .select('id, categories_json, samurai_type_key, samurai_type_ja')
      .eq('id', rid)
      .maybeSingle();

    if (selErr) {
      // 取得エラーは500
      return NextResponse.json({ ok: false, error: 'select_failed' }, { status: 500 });
    }

    // 2) なければ INSERT
    if (!row) {
      const insertPayload: Record<string, any> = {
        id: rid,
        categories_json: cats,
        samurai_type_key: samuraiTypeKey ?? null,
        samurai_type_ja:  samuraiTypeJa  ?? null,
        score_version: 'v1',
        created_at: now,
        updated_at: now,
      };

      const { error: insErr } = await supabase.from('samurairesults').insert(insertPayload);
      if (insErr) {
        return NextResponse.json({ ok: false, error: 'insert_failed' }, { status: 500 });
      }
      return NextResponse.json({ ok: true, created: true, updated: false });
    }

    // 3) 既に categories_json が入っていれば確定済み → 何もしない
    if (row.categories_json) {
      return NextResponse.json({ ok: true, created: false, updated: false });
    }

    // 4) 未確定なら UPDATE（確定させる）
    const update: Record<string, any> = {
      categories_json: cats,
      score_version: 'v1',
      updated_at: now,
    };
    if (!row.samurai_type_key && samuraiTypeKey) update.samurai_type_key = samuraiTypeKey;
    if (!row.samurai_type_ja  && samuraiTypeJa ) update.samurai_type_ja  = samuraiTypeJa;

    let q = supabase.from('samurairesults').update(update).eq('id', rid);
    // 二重確定防止：確定済み（NOT NULL）は触らない
    q = q.is('categories_json', null);

    const { error: upErr, data: rows } = await q.select('id'); // ← v2は第2引数NGなので data長で判定
    if (upErr) {
      console.error('[finalize] update failed:', upErr);
      return NextResponse.json({ ok: false, error: 'update_failed' }, { status: 500 });
    }

    return NextResponse.json({ ok: true, created: false, updated: !!(rows?.length) });
  } catch (e) {
    console.error('[finalize] ', e);
    return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 });
  }
}
