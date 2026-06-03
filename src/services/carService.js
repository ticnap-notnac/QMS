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

/**
 * Calls the AI clause-matching endpoint with the CAR description and
 * nonconformance flags. Returns ranked ISO clause suggestions.
 *
 * @param {{ description: string, flags: object }} payload
 * @param {string} userAuthId
 */
export async function suggestClausesForCar(payload, userAuthId) {
  if (!userAuthId) throw new Error('Missing authentication. Please log in.')

  return await request('/car/suggest-clauses', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: {
      'x-user-auth-id': userAuthId
    }
  })
}

/**
 * Fetches all CARs linked to a given ISO clause ID.
 *
 * @param {number} clauseId
 * @param {string} userAuthId
 */
export async function fetchCarsForClause(clauseId, userAuthId) {
  if (!userAuthId) throw new Error('Missing authentication. Please log in.')

  return await request(`/car/clause/${clauseId}/cars`, {
    headers: { 'x-user-auth-id': userAuthId }
  })
}
