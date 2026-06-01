// src/services/userService.js
import { request } from '@/lib/api'
import { getCurrentAuthId } from '@/services/authService'

async function buildAuthHeaders() {
  const authId = await getCurrentAuthId()
  return authId ? { 'x-user-auth-id': authId } : {}
}

export async function fetchUsers() {
  const headers = await buildAuthHeaders()
  return request('/users', { headers })
}

export async function createUser(payload) {
  const headers = await buildAuthHeaders()
  return request('/users', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers,
  })
}

// backwards-compatible alias
export { createUser as createAdminUser }

export async function updateUser(id, payload) {
  const headers = await buildAuthHeaders()
  return request(`/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
    headers,
  })
}

export async function deleteUser(id) {
  const headers = await buildAuthHeaders()
  return request(`/users/${id}`, {
    method: 'DELETE',
    headers,
  })
}

export async function updateUserStatus(userId, status) {
  const headers = await buildAuthHeaders()
  return request(`/users/${userId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
    headers,
  })
}