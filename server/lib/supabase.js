import { createClient } from '@supabase/supabase-js'
import dotenv from 'dotenv'
import path from 'path'
import { fileURLToPath } from 'url'

// Load .env files in a robust order so the server picks up the service role key
// regardless of how `npm`/`node` is invoked (cwd may be project root or server/).
// 1) project root .env (../.env relative to server file)
// 2) project root .env (process.cwd())
// 3) server/.env (same folder as this file)
try {
  // attempt to load parent (project root) .env
  dotenv.config({ path: path.resolve(process.cwd(), '..', '.env') })
} catch (err) {
  // ignore
}
try {
  // attempt to load process.cwd() .env (covers cases where cwd is project root)
  dotenv.config({ path: path.resolve(process.cwd(), '.env') })
} catch (err) {
  // ignore
}
// attempt to load server/.env using this module's directory
try {
  const __dirname = path.dirname(fileURLToPath(import.meta.url))
  dotenv.config({ path: path.resolve(__dirname, '.env') })
} catch (err) {
  // ignore
}

const supabaseUrl = process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL
const supabaseKey =
  process.env.SUPABASE_SERVICE_ROLE_KEY ||
  process.env.SUPABASE_SERVICE_KEY ||
  process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
  process.env.VITE_SUPABASE_ANON_KEY

if (!supabaseUrl) {
  throw new Error('Missing SUPABASE_URL or VITE_SUPABASE_URL in server environment.')
}

if (!supabaseKey) {
  throw new Error('Missing Supabase key in server environment.')
}

export const hasServiceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY)

export const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})