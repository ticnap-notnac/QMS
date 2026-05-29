import { supabase } from '../lib/supabase.js'

export async function getLogs(req, res) {
  const limit = Number(req.query.limit || 50)
  const offset = Number(req.query.offset || 0)
  const { level, source, user_auth_id: userAuthId, from, to, action } = req.query || {}

  let query = supabase
    .from('system_logs')
    .select('id,created_at,level,source,user_auth_id,action,details,ip,metadata', { count: 'exact' })
    .order('created_at', { ascending: false })

  if (level) query = query.eq('level', level)
  if (source) query = query.eq('source', source)
  if (userAuthId) query = query.eq('user_auth_id', userAuthId)
  if (from) query = query.gte('created_at', from)
  if (to) query = query.lte('created_at', to)
  if (action) query = query.ilike('action', `%${action}%`)

  const { data, error, count } = await query.range(offset, Math.max(0, offset + limit - 1))

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  return res.json({ data: data || [], count: count || 0 })
}

export async function insertLog(req, res) {
  const payload = req.body || {}
  const { data, error } = await supabase.from('system_logs').insert([payload])

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  return res.json(data || [])
}

export async function recordLogRead(req, res) {
  const payload = req.body || {}
  const { data, error } = await supabase.from('system_log_reads').insert([payload])

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  return res.json(data || [])
}