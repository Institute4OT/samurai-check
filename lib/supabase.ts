// /lib/supabase.ts
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/** ===== Supabase クライアント（公開キー） ===== */
const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";
const SUPABASE_ANON_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || "";

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  // ビルド時に落ちるより、実行時に明示エラーの方がデバッグしやすい
  throw new Error(
    "[lib/supabase] NEXT_PUBLIC_SUPABASE_URL / NEXT_PUBLIC_SUPABASE_ANON_KEY が未設定です。",
  );
}

/** フロント用（匿名）クライアント。Auth セッションは保持しない */
export const supabase: SupabaseClient = createClient(
  SUPABASE_URL,
  SUPABASE_ANON_KEY,
  {
    auth: { persistSession: false },
  },
);

/** ===== 型（samurairesults テーブルの想定スキーマ） ===== */

export type CategoriesJson = Array<{ key: string; score: number }>;

/**
 * 既存データ互換を含む柔らかめの型。
 * - 初回 insert では legacy 列 `samurai_type` を使うことがある
 * - finalize API で `samurai_type_key`, `samurai_type_ja`, `categories_json` を確定保存
 */
export interface SamuraiResult {
  /** 結果ID（UUID / ULID / NanoID など） */
  id: string;

  /** 監査用のタイムスタンプ（DB側で自動更新でも OK） */
  created_at?: string | null;
  updated_at?: string | null;

  /** 旧互換（初期保存で使うことがある） */
  samurai_type?: string | null;

  /** 確定保存フィールド（finalize API が更新） */
  samurai_type_key?: string | null;
  samurai_type_ja?: string | null;
  categories_json?: CategoriesJson | null;

  /** 回答スナップショット（Q→選択肢の配列） */
  score_pattern?: Record<string, string[]> | null;

  /** 申込フォームで収集する任意情報 */
  name?: string | null;
  email?: string | null;
  company_size?: string | null;
}
