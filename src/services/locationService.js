import { request } from '@/lib/api'
import { getCurrentAuthId } from '@/services/authService'

async function buildAuthHeaders() {
  const userAuthId = await getCurrentAuthId()
  return userAuthId ? { 'x-user-auth-id': userAuthId } : {}
}

export async function fetchLocations() {
  return await request('/locations')
}

export const loadLocations = fetchLocations

export async function createLocation(locationName) {
  const headers = await buildAuthHeaders()
  return await request('/locations', { method: 'POST', headers, body: JSON.stringify({ locationName }) })
}

export async function deleteLocation(id) {
  const headers = await buildAuthHeaders()
  await request(`/locations/${id}`, { method: 'DELETE', headers })
  return true
}
