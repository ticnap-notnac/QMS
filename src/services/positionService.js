import { request } from '@/lib/api'

export async function fetchPositions() {
  const data = await request('/positions')
  return (data || []).map((item) => ({
    ...item,
    position_name: item.position_name || '',
  }))
}

export const loadPositions = fetchPositions

export async function createPosition(positionName) {
  return await request('/positions', { method: 'POST', body: JSON.stringify({ positionName }) })
}

export async function deletePosition(id) {
  await request(`/positions/${id}`, { method: 'DELETE' })
  return true
}

export async function updatePosition(id, position_name) {
  return await request(`/positions/${id}`, { method: 'PUT', body: JSON.stringify({ position_name }) })
}
