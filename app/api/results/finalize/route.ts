// app/api/results/finalize/route.ts
import { NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { normalizeCats } from '@/lib/scoreSnapshot';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  try {
    const { rid, samuraiTypeKey, samuraiTypeJa, categories } = await req.json();
    if (!rid || !Array.isArray(categories) || (!samuraiTypeKey && !samuraiTypeJa)) {
      return NextResponse.json({ ok: false, error: 'bad_request' }, { status: 400 });
    }

    const cats = normalizeCats(categories);
    const now = new Date().toISOString();

    // 1) 行の有無
    const { data: row } = await supabase
      .from('samurairesults')
      .select('id, categories_json')
      .eq('id', rid)
      .maybeSingle();

    if (!row) {
      // 2) 無ければ作成
      const insert = {
        id: rid,
        categories_json: cats,
        samurai_type_key: samuraiTypeKey ?? null,
        samurai_type_ja: samuraiTypeJa ?? null,
        score_version: 'v1',
        created_at: now,
        updated_at: now,
      };
      const { error: insErr } = await supabase.from('samurairesults').insert(insert);
      if (insErr) {
        console.error('[finalize] insert failed:', insErr);
        return NextResponse.json({ ok: false, error: 'insert_failed' }, { status: 500 });
      }
      return NextResponse.json({ ok: true, created: true, updated: false });
    }

    // 3) 既存かつ未確定なら更新
    if (!row.categories_json) {
      const update: Record<string, any> = {
        categories_json: cats,
        score_version: 'v1',
        updated_at: now,
      };
      if (samuraiTypeKey) update.samurai_type_key = samuraiTypeKey;
      if (samuraiTypeJa) update.samurai_type_ja = samuraiTypeJa;

      const { error: upErr } = await supabase
        .from('samurairesults')
        .update(update)
        .eq('id', rid);

      if (upErr) {
        console.error('[finalize] update failed:', upErr);
        return NextResponse.json({ ok: false, error: 'update_failed' }, { status: 500 });
      }
      return NextResponse.json({ ok: true, created: false, updated: true });
    }

    // 4) すでに確定済み
    return NextResponse.json({ ok: true, created: false, updated: false });
  } catch (e) {
    console.error('[finalize]', e);
    return NextResponse.json({ ok: false, error: 'server_error' }, { status: 500 });
  }
}
