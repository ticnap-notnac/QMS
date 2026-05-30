import { supabase } from './supabase.js'

export async function writeAudit({ level = 'audit', source, action, userAuthId = null, details = {}, metadata = null, ip = null } = {}) {
  try {
    const payload = { level, source, action, user_auth_id: userAuthId, details, metadata, ip }
    // remove undefined keys
    Object.keys(payload).forEach((k) => payload[k] === null && delete payload[k])
    await supabase.from('system_logs').insert([payload])
  } catch (err) {
    // swallow logging errors but print a warning for server operators
    // eslint-disable-next-line no-console
    console.warn('writeAudit failed:', err?.message || err)
  }
}

export default { writeAudit }
