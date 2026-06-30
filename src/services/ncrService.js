import { request } from '@/lib/api'

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
  return await request(`/ncr/${id}/investigation`, {
    method: 'PUT',
    body: formData,
  })
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
  return await request('/ncr/submit', {
    method: 'POST',
    body: formData,
  })
}

export async function fetchRecurringTrends(days = 14) {
  return await request(`/ncr/recurring-trends?days=${days}`)
}