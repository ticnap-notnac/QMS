// src/services/userService.js
import { request } from '@/lib/api'

export async function fetchUsers() {
  return request('/users')
}

export async function createUser(payload) {
  return request('/users', {
    method: 'POST',
    body: JSON.stringify(payload),
  })
}

// backwards-compatible alias
export { createUser as createAdminUser }

export async function updateUser(id, payload) {
  return request(`/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
  })
}

export async function deleteUser(id) {
  return request(`/users/${id}`, {
    method: 'DELETE',
  })
}

export async function updateUserStatus(userId, status) {
  return request(`/users/${userId}/status`, {
    method: 'PATCH',
    body: JSON.stringify({ status }),
  })
}