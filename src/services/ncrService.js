import { request } from '@/lib/api'
import { getCurrentAuthId } from '@/services/authService'

async function buildAuthHeaders() {
  const authId = await getCurrentAuthId()
  return authId ? { 'x-user-auth-id': authId } : {}
}

export async function fetchReports() {
  const headers = await buildAuthHeaders()
  return await request('/ncr', { headers })
}

export async function createReport(payload) {
  const headers = await buildAuthHeaders()
  return await request('/ncr', {
    method: 'POST',
    headers,
    body: JSON.stringify(payload),
  })
}

export async function updateReport(id, payload) {
  const headers = await buildAuthHeaders()
  return await request(`/ncr/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(payload),
  })
}

export async function deleteReport(id) {
  const headers = await buildAuthHeaders()
  return await request(`/ncr/${id}`, {
    method: 'DELETE',
    headers,
  })
}