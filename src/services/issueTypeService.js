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
