import { supabase } from '@/utils/supabase'

export async function insertLog({
  level = 'info',
  source = null,
  userAuthId = null,
  action = null,
  details = null,
  ip = null,
  metadata = null,
} = {}) {
  // If caller didn't provide an auth UID, try to read it from the current session
  let authUid = userAuthId
  if (!authUid) {
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      authUid = sessionData?.session?.user?.id || null
    } catch (err) {
      // ignore - we'll allow NULL if no session available
      authUid = null
    }
  }

  const payload = {
    level,
    source,
    user_auth_id: authUid,
    action,
    details,
    ip,
    metadata,
  }

  const { data, error } = await supabase.from('system_logs').insert([payload])
  if (error) throw new Error(`Failed to insert log: ${error.message}`)
  return data
}

export async function fetchLogs({ limit = 50, offset = 0, filters = {} } = {}) {
  let q = supabase
    .from('system_logs')
    .select('id,created_at,level,source,user_auth_id,action,details,ip,metadata', { count: 'exact' })
    .order('created_at', { ascending: false })

  if (filters.level) q = q.eq('level', filters.level)
  if (filters.source) q = q.eq('source', filters.source)
  if (filters.user_auth_id) q = q.eq('user_auth_id', filters.user_auth_id)
  if (filters.from) q = q.gte('created_at', filters.from)
  if (filters.to) q = q.lte('created_at', filters.to)
  if (filters.action) q = q.ilike('action', `%${filters.action}%`)

  const start = offset
  const end = Math.max(0, offset + limit - 1)
  const { data, error, count } = await q.range(start, end)
  if (error) throw new Error(`Failed to fetch logs: ${error.message}`)
  return { data, count }
}

// Convenience alias
export { fetchLogs as listLogs }

export async function recordLogRead({ userAuthId = null, query = null, count = null } = {}) {
  let authUid = userAuthId
  if (!authUid) {
    try {
      const { data: sessionData } = await supabase.auth.getSession()
      authUid = sessionData?.session?.user?.id || null
    } catch (err) {
      authUid = null
    }
  }

  const payload = {
    user_auth_id: authUid,
    query: query || null,
    result_count: count || null,
  }

  const { data, error } = await supabase.from('system_log_reads').insert([payload])
  if (error) {
    // don't throw — read audit failure shouldn't block UI
    console.warn('Failed to record log read:', error.message)
    return null
  }
  return data
}
