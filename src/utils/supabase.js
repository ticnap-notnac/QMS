import { createClient } from '@supabase/supabase-js'

let supabaseUrl = import.meta.env.VITE_SUPABASE_URL || ''
let supabaseAnonKey = import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY || ''

// 🧼 Auto-Cleanup: Safely strip quote wraps or trailing endpoint artifacts if present
supabaseUrl = supabaseUrl.replace(/['"]/g, '').trim()
supabaseAnonKey = supabaseAnonKey.replace(/['"]/g, '').trim()

// 🛡️ Proactive Warning System
if (!supabaseUrl || !supabaseAnonKey) {
  console.error(
    "⚠️ CRITICAL INFRASTRUCTURE ERROR: Environment variables are missing completely!\n" +
    "Check your root `.env` file structure."
  );
} else if (supabaseAnonKey.startsWith('sb_publishable_')) {
  console.warn(
    "⚠️ CODEBASE CONFIGURATION ALERT:\n" +
    "The client is actively loading a placeholder key ('sb_publishable_...').\n" +
    "Supabase cloud infrastructure will reject this token. You MUST replace this value " +
    "in your root `.env` file with an actual Public Anon JWT (which starts with 'eyJ...')."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey)