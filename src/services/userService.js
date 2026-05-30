import { request } from '@/lib/api'
import { insertLog } from '@/services/logService'

export async function createUser(payload) {
  // payload should contain firstName, lastName, email, password, userName, contactNumber, roleId, departmentId
  const data = await request('/users', { method: 'POST', body: JSON.stringify(payload) })
  try {
    await insertLog({
      level: 'audit',
      source: 'users',
      action: 'user_create',
      details: { id: data?.id ?? null, email: payload?.email, userName: payload?.userName }
    })
  } catch (err) {
    console.warn('Failed to insert user_create log', err?.message || err)
  }
  return data
}

// backwards-compatible alias
export { createUser as createAdminUser }
