import { supabase } from '../lib/supabase.js'

export async function getLogs(req, res) {
  const limit = Number(req.query.limit || 50)
  const offset = Number(req.query.offset || 0)
  const { level, source, user_auth_id, userAuthId, from, to, action } = req.query || {}
  const userAuth = user_auth_id || userAuthId

  let query = supabase
    .from('system_logs')
    .select('id,created_at,level,source,user_auth_id,action,details,ip,metadata', { count: 'exact' })
    .order('created_at', { ascending: false })

  if (level) query = query.eq('level', level)
  if (source) query = query.eq('source', source)
  if (userAuth) query = query.eq('user_auth_id', userAuth)
  if (from) query = query.gte('created_at', from)
  if (to) query = query.lte('created_at', to)
  if (action) query = query.ilike('action', `%${action}%`)

  const { data, error, count } = await query.range(offset, Math.max(0, offset + limit - 1))

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  const logs = data || []
  const authIds = [...new Set(logs.map((row) => row.user_auth_id).filter(Boolean))]
  let usersByAuthId = new Map()

  if (authIds.length > 0) {
    const { data: usersData, error: usersError } = await supabase
      .from('users')
      .select('auth_id,first_name,last_name,user_name,email')
      .in('auth_id', authIds)

    if (!usersError && usersData) {
      usersByAuthId = new Map(usersData.map((u) => [u.auth_id, u]))
    }
  }

  const enrichedLogs = logs.map((row) => {
    const user = row.user_auth_id ? usersByAuthId.get(row.user_auth_id) : null
    const fullName = user ? `${user.first_name || ''} ${user.last_name || ''}`.trim() : ''

    return {
      ...row,
      user_display: fullName || user?.user_name || user?.email || null,
    }
  })

  return res.json({ data: enrichedLogs, count: count || 0 })
}

export async function insertLog(req, res) {
  const payload = req.body || {}
  // accept camelCase keys from the frontend and map to snake_case for the DB
  if (payload.userAuthId && !payload.user_auth_id) {
    payload.user_auth_id = payload.userAuthId
    delete payload.userAuthId
  }
  const { data, error } = await supabase.from('system_logs').insert([payload])

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  return res.json(data || [])
}

export async function recordLogRead(req, res) {
  const payload = req.body || {}
  // map camelCase to snake_case for read records as well
  if (payload.userAuthId && !payload.user_auth_id) {
    payload.user_auth_id = payload.userAuthId
    delete payload.userAuthId
  }
  const { data, error } = await supabase.from('system_log_reads').insert([payload])

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  return res.json(data || [])
}