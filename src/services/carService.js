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
