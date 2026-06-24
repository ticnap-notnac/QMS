import { request } from '@/lib/api'
import { supabase } from '@/utils/supabase'

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

/**
 * Fetches all linked clauses for a given CAR ID.
 *
 * @param {number} carId
 */
export async function fetchLinkedClausesForCar(carId) {
  const { data, error } = await supabase
    .from('car_clause_links')
    .select('clause_id, iso_clauses(clause_number, title)')
    .eq('car_report_id', carId)
  if (error) throw error
  return (data || []).map(row => ({
    clause_id: row.clause_id,
    ...(row.iso_clauses || {})
  })).filter(c => c.clause_number)
}

/**
 * Updates an existing CAR report
 *
 * @param {number} carId
 * @param {object} payload
 * @param {string} userAuthId
 */
export async function updateCarReport(carId, payload, userAuthId) {
  if (!userAuthId) throw new Error('Missing authentication. Please log in.')

  return await request(`/car/${carId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
    headers: {
      'x-user-auth-id': userAuthId
    }
  })
}

/**
 * Soft deletes a CAR report
 *
 * @param {number} carId
 * @param {string} userAuthId
 */
export async function deleteCarReport(carId, userAuthId) {
  if (!userAuthId) throw new Error('Missing authentication. Please log in.')

  return await request(`/car/${carId}`, {
    method: 'DELETE',
    headers: {
      'x-user-auth-id': userAuthId
    }
  })
}
