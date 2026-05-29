import { request } from '@/lib/api'

export async function createUser(payload) {
  // payload should contain firstName, lastName, email, password, userName, contactNumber, roleId, departmentId
  return await request('/users', { method: 'POST', body: JSON.stringify(payload) })
}

// backwards-compatible alias
export { createUser as createAdminUser }
