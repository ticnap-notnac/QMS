import { request, API_BASE_URL } from '@/lib/api'
import { supabase } from '@/utils/supabase'

export async function fetchReports() {
  return await request('/ncr')
}

export async function fetchInvestigatedReports() {
  return await request('/ncr?scope=investigated')
}

export async function fetchAllReports() {
  return await request('/ncr?scope=all')
}

export async function fetchClosedReports() {
  return await request('/ncr?scope=closed')
}

export async function createReport(payload) {
  return await request('/ncr', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

export async function updateReport(id, payload) {
  return await request(`/ncr/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function updateReportInvestigationMultipart(id, formData) {
  const { data: { session } } = await supabase.auth.getSession()
  const headers = session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}

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
  return await request(`/ncr/${id}/assign`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function reviewReportApproval(id, payload) {
  return await request(`/ncr/${id}/approval`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function rateReport(id, rating) {
  return await request(`/ncr/${id}/rate`, {
    method: 'POST',
    body: JSON.stringify({ rating }),
  })
}

export async function getReportRating(id) {
  return await request(`/ncr/${id}/rating`)
}

export async function deleteReport(id) {
  return await request(`/ncr/${id}`, {
    method: 'DELETE',
  })
}

export async function submitNcrMultipart(formData) {
  const { data: { session } } = await supabase.auth.getSession()
  const headers = session?.access_token ? { 'Authorization': `Bearer ${session.access_token}` } : {}

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