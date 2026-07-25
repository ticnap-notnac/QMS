import { request } from '@/lib/api'

export async function fetchIssueTypes() {
  return await request('/issue-types')
}

export const loadIssueTypes = fetchIssueTypes

export async function createIssueType(issueTypeName) {
  return await request('/issue-types', { method: 'POST', body: JSON.stringify({ issueTypeName }) })
}

export async function deleteIssueType(id) {
  await request(`/issue-types/${id}`, { method: 'DELETE' })
  return true
}

export async function updateIssueType(id, issue_type_name) {
  return await request(`/issue-types/${id}`, { method: 'PUT', body: JSON.stringify({ issue_type_name }) })
}

