import { supabase } from '../lib/supabase.js'

// Private helpers---------------------------------------------------------------------------

function normaliseCamelAuthId(payload) {
  const p = { ...payload }
  if (p.userAuthId && !p.user_auth_id) {
    p.user_auth_id = p.userAuthId
    delete p.userAuthId
  }
  return p
}


async function fetchUsersByAuthIds(authIds) {
  if (!authIds.length) return new Map()

  const { data, error } = await supabase
    .from('users')
    .select('auth_id,first_name,last_name,user_name,email')
    .in('auth_id', authIds)

  if (error || !data) return new Map()

  return new Map(data.map((u) => [u.auth_id, u]))
}

function resolveUserDisplay(user) {
  if (!user) return null
  const fullName = `${user.first_name || ''} ${user.last_name || ''}`.trim()
  return fullName || user.user_name || user.email || null
}


// Service methods---------------------------------------------------------------------------

export async function getSystemLogs({ limit = 50, offset = 0, level, source, userAuth, from, to, action } = {}) {
  let query = supabase
    .from('system_logs')
    .select('id,created_at,level,source,user_auth_id,action,details,ip,metadata', { count: 'exact' })
    .order('created_at', { ascending: false })

  if (level)     query = query.eq('level', level)
  if (source)    query = query.eq('source', source)
  if (userAuth)  query = query.eq('user_auth_id', userAuth)
  if (from)      query = query.gte('created_at', from)
  if (to)        query = query.lte('created_at', to)
  if (action)    query = query.ilike('action', `%${action}%`)

  const { data, error, count } = await query.range(offset, Math.max(0, offset + limit - 1))

  if (error) throw new Error(error.message)

  const logs = data || []

  const authIds = [...new Set(logs.map((row) => row.user_auth_id).filter(Boolean))]
  const usersByAuthId = await fetchUsersByAuthIds(authIds)

  const enrichedLogs = logs.map((row) => ({
    ...row,
    user_display: resolveUserDisplay(
      row.user_auth_id ? usersByAuthId.get(row.user_auth_id) : null,
    ),
  }))

  return { data: enrichedLogs, count: count || 0 }
}

export async function insertSystemLog(payload) {
  const normalised = normaliseCamelAuthId(payload)

  const { data, error } = await supabase
    .from('system_logs')
    .insert([normalised])

  if (error) throw new Error(error.message)

  return data || []
}


export async function recordSystemLogRead(payload) {
  const normalised = normaliseCamelAuthId(payload)

  const { data, error } = await supabase
    .from('system_log_reads')
    .insert([normalised])

  if (error) throw new Error(error.message)

  return data || []
}