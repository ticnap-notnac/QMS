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
    if (typeof payload === 'string') {
      let parsed = []
      try {
        parsed = JSON.parse(payload.details)
      } catch {
        // Just fallback to returning the whole detail string if not JSON
        parsed = [{ message: payload.details }]
      }
      
      // Instead of hiding it, we map the Zod errors into a readable array of strings
      const detailedErrors = parsed.map(err => err.message)
      throw new Error(detailedErrors.join('\n'))
    } else if (payload?.details && Array.isArray(payload.details) && payload.details.length > 0) {
      // Extract specific field errors from Zod validation
      const detailStr = payload.details.map(d => d.message).join(', ')
      throw new Error(`${payload.error || 'Validation Error'}: ${detailStr}`)
    } else {
      throw new Error(payload?.error || response.statusText)
    }
  }

  return payload
}

export { API_BASE_URL, request }