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
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: window.sessionStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true
  }
})