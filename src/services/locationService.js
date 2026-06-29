import { request } from '@/lib/api'

export async function fetchLocations() {
  return await request('/locations')
}

export const loadLocations = fetchLocations

export async function createLocation(locationName) {
  return await request('/locations', { method: 'POST', body: JSON.stringify({ locationName }) })
}

export async function deleteLocation(id) {
  await request(`/locations/${id}`, { method: 'DELETE' })
  return true
}

export async function updateLocation(id, location_name) {
  return await request(`/locations/${id}`, { method: 'PUT', body: JSON.stringify({ location_name }) })
}
