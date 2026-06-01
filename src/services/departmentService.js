import { request } from '@/lib/api'
import { getCurrentAuthId } from '@/services/authService'

async function buildAuthHeaders() {
  const userAuthId = await getCurrentAuthId()
  return userAuthId ? { 'x-user-auth-id': userAuthId } : {}
}

export async function loadDepartments() {
  return await request('/departments')
}

export async function createDepartment(departmentName) {
  const headers = await buildAuthHeaders()
  return await request('/departments', {
    method: 'POST',
    headers,
    body: JSON.stringify({ departmentName }),
  })
}

export async function deleteDepartment(id) {
  const headers = await buildAuthHeaders()
  await request(`/departments/${id}`, {
    method: 'DELETE',
    headers,
  })
  return true
}
