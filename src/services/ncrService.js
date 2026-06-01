import { request } from '@/lib/api'
import { getCurrentAuthId } from '@/services/authService'
import { API_BASE_URL } from '@/lib/api'

async function buildAuthHeaders() {
  const authId = await getCurrentAuthId()
  return authId ? { 'x-user-auth-id': authId } : {}
}

export async function fetchReports() {
  const headers = await buildAuthHeaders()
  return await request('/ncr', { headers })
}

export async function fetchInvestigatedReports() {
  const headers = await buildAuthHeaders()
  return await request('/ncr?scope=investigated', { headers })
}

export async function fetchAllReports() {
  const headers = await buildAuthHeaders()
  return await request('/ncr?scope=all', { headers })
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

export async function updateReportInvestigationMultipart(id, formData, authId) {
  const headers = {}
  const userAuthId = authId || (await getCurrentAuthId())
  if (userAuthId) headers['x-user-auth-id'] = userAuthId

  const res = await fetch(`${API_BASE_URL}/ncr/${id}/investigation`, {
    method: 'PUT',
    headers,
    body: formData,
  })

  const contentType = res.headers.get('content-type') || ''
  const payload = contentType.includes('application/json') ? await res.json() : await res.text()
  if (!res.ok) {
    const message = typeof payload === 'string'
      ? payload
      : payload?.error || payload?.message || `Update failed (${res.status})`
    throw new Error(message)
  }
  return payload
}

export async function assignReportToEmployee(id, payload) {
  const headers = await buildAuthHeaders()
  return await request(`/ncr/${id}/assign`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(payload),
  })
}

export async function reviewReportApproval(id, payload) {
  const headers = await buildAuthHeaders()
  return await request(`/ncr/${id}/approval`, {
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

export async function submitNcrMultipart(formData, authId) {
  const headers = {}
  const id = authId || (await getCurrentAuthId())
  if (id) headers['x-user-auth-id'] = id

  const res = await fetch(`${API_BASE_URL}/ncr/submit`, {
    method: 'POST',
    headers,
    body: formData,
  })

  const contentType = res.headers.get('content-type') || ''
  const payload = contentType.includes('application/json') ? await res.json() : await res.text()
  if (!res.ok) {
    const message = typeof payload === 'string'
      ? payload
      : payload?.error || payload?.message || `Submit failed (${res.status})`
    throw new Error(message)
  }
  return payload
}