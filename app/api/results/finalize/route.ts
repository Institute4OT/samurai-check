// app/api/results/finalize/route.ts
// 診断完了時にサーバー確定し、DBへスナップショットを書き込み

import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { normalizeCats } from '@/lib/scoreSnapshot';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const json = await req.json();
    const { rid, samuraiTypeKey, samuraiTypeJa, categories } = json ?? {};

    if (!rid || !Array.isArray(categories) || (!samuraiTypeKey && !samuraiTypeJa)) {
      return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 });
    }

    // 固定順・0–3に正規化
    const cats = normalizeCats(categories);

    // 既に確定済みなら再確定しない（上書き防止）
    const { data: row, error: selErr } = await supabase
      .from('samurairesults')
      .select('id,categories_json,samurai_type_key,samurai_type_ja')
      .eq('id', rid)
      .single();

    if (selErr) {
      return NextResponse.json({ ok: false, error: 'not_found' }, { status: 404 });
    }

    if (!row?.categories_json) {
      const { error: upErr } = await supabase
        .from('samurairesults')
        .update({
          categories_json: cats,
          samurai_type_key: samuraiTypeKey ?? row?.samurai_type_key ?? null,
          samurai_type_ja:  samuraiTypeJa  ?? row?.samurai_type_ja  ?? null,
          score_version: 'v1',
        })
        .eq('id', rid);

      if (upErr) {
        return NextResponse.json({ ok: false, error: 'update_failed' }, { status: 500 });
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error('[finalize] ', e);
    return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 });
  }
}
