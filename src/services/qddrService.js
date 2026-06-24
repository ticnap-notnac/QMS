import { request } from '@/lib/api'

export async function submitQddrReport(payload, userAuthId) {
  if (!userAuthId) throw new Error('Missing authentication. Please log in.')
  
  return await request('/qddr', {
    method: 'POST',
    body: JSON.stringify(payload),
    headers: {
      'x-user-auth-id': userAuthId
    }
  })
}

export async function updateQddrReport(qddrId, payload, userAuthId) {
  if (!userAuthId) throw new Error('Missing authentication. Please log in.')

  return await request(`/qddr/${qddrId}`, {
    method: 'PUT',
    body: JSON.stringify(payload),
    headers: {
      'x-user-auth-id': userAuthId
    }
  })
}

/**
 * Updates a QDDR report fully
 */
export async function editQddrReport(qddrId, payload, userAuthId) {
  if (!userAuthId) throw new Error('Missing authentication. Please log in.')

  return await request(`/qddr/${qddrId}/edit`, {
    method: 'PUT',
    body: JSON.stringify(payload),
    headers: {
      'x-user-auth-id': userAuthId
    }
  })
}

/**
 * Soft deletes a QDDR report
 */
export async function deleteQddrReport(qddrId, userAuthId) {
  if (!userAuthId) throw new Error('Missing authentication. Please log in.')

  return await request(`/qddr/${qddrId}`, {
    method: 'DELETE',
    headers: {
      'x-user-auth-id': userAuthId
    }
  })
}
