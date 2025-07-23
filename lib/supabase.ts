import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!

export const supabase = createClient(supabaseUrl, supabaseAnonKey)

export interface SamuraiResult {
  id: string
  created_at: string
  score_pattern: any
  result_type: string
  name?: string | null
  email?: string | null
  company_size?: string | null
}