import { request } from '@/lib/api'
import { getCurrentAuthId } from '@/services/authService'

export async function insertLog(payload = {}) {
  return await request('/logs', { method: 'POST', body: JSON.stringify(payload) })
}

export async function logAction({ level = 'audit', source, action, details = {}, userAuthId: providedAuthId } = {}) {
  try {
    const userAuthId = providedAuthId !== undefined ? providedAuthId : await getCurrentAuthId()
    const payload = { level, source, action, userAuthId, details }
    return await insertLog(payload)
  } catch (err) {
    // don't fail UI on logging errors
    console.warn('Failed to write audit log:', err?.message || err)
    return null
  }
}

export async function fetchLogs({ limit = 50, offset = 0, filters = {} } = {}) {
  const params = new URLSearchParams()
  params.set('limit', String(limit))
  params.set('offset', String(offset))
  Object.entries(filters || {}).forEach(([k, v]) => { if (v != null) params.set(k, String(v)) })
  const res = await request(`/logs?${params.toString()}`)
  // server returns { data, count }
  return { data: res.data || [], count: res.count || 0 }
}

export { fetchLogs as listLogs }

export async function recordLogRead(payload = {}) {
  try {
    return await request('/logs/reads', { method: 'POST', body: JSON.stringify(payload) })
  } catch (err) {
    // don't fail UI on audit errors
    console.warn('Failed to record log read:', err?.message || err)
    return null
  }
}

export default {
  insertLog,
  logAction,
  fetchLogs,
  listLogs: fetchLogs,
  recordLogRead,
}
