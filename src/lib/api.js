import { supabase } from '@/utils/supabase'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'

async function request(path, options = {}) {
  const { headers: requestHeaders, ...restOptions } = options
  
  const { data: { session } } = await supabase.auth.getSession()
  const token = session?.access_token

  const isMultipart = restOptions.body instanceof FormData

  const response = await fetch(`${API_BASE_URL}${path}`, {
    ...restOptions,
    headers: {
      ...(!isMultipart ? { 'Content-Type': 'application/json' } : {}),
      ...(token ? { 'Authorization': `Bearer ${token}` } : {}),
      ...(requestHeaders || {}),
    },
  })

  const contentType = response.headers.get('content-type') || ''
  const payload = contentType.includes('application/json') ? await response.json() : await response.text()

  if (!response.ok) {
    const message = typeof payload === 'string' ? payload : payload?.error || response.statusText
    throw new Error(message)
  }

  return payload
}

export { API_BASE_URL, request }