export function getDebug(_req, res) {
  // do not return the key itself; only whether it's present
  const hasService = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY)
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || null
  return res.json({ hasServiceRole: hasService, supabaseUrl })
}
