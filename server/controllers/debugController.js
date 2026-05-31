import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

export function getDebug(_req, res) {
  // do not return the key itself; only whether it's present
  const hasService = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY)
  const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || null

  // list route files for convenience
  let routes = []
  try {
    const __dirname = path.dirname(fileURLToPath(import.meta.url))
    const routesDir = path.join(__dirname, '../routes')
    routes = fs.readdirSync(routesDir).filter((f) => f.endsWith('.js'))
  } catch (err) {
    console.error('Error reading routes directory:', err)
    routes = []
  }

  return res.json({ hasServiceRole: hasService, supabaseUrl, routes })
}
