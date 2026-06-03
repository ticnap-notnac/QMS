import { request } from '@/lib/api'

export async function submitCarReport(payload, userAuthId) {
  if (!userAuthId) throw new Error('Missing authentication. Please log in.')

  return await request('/car', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: {
      'x-user-auth-id': userAuthId
    }
  })
}

export async function submitCapaPlan(carId, payload, userAuthId) {
  if (!userAuthId) throw new Error('Missing authentication. Please log in.')

  return await request(`/car/${carId}/capa`, {
    method: 'PUT',
    body: JSON.stringify(payload),
    headers: {
      'x-user-auth-id': userAuthId
    }
  })
}

export async function verifyCarPlan(carId, payload, userAuthId) {
  if (!userAuthId) throw new Error('Missing authentication. Please log in.')

  return await request(`/car/${carId}/verify`, {
    method: 'PUT',
    body: JSON.stringify(payload),
    headers: {
      'x-user-auth-id': userAuthId
    }
  })
}

