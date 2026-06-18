import { request } from '@/lib/api'

export async function fetchTemplates() {
  return request('/audit-templates')
}

export async function createTemplate(payload) {
  return request('/audit-templates', {
    method: 'POST',
    body: JSON.stringify(payload)
  })
}

export async function updateTemplate(id, payload) {
  return request(`/audit-templates/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload)
  })
}

export async function deleteTemplate(id) {
  return request(`/audit-templates/${id}`, {
    method: 'DELETE'
  })
}
