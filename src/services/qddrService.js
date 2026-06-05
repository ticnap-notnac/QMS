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
