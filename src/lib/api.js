import { supabase } from '@/utils/supabase'

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:3000/api'

function toPlainLanguageError(message) {
  const text = String(message || '').trim()

  if (!text) {
    return 'We could not complete this action. Please try again.'
  }

  if (/only gmail addresses are allowed/i.test(text)) {
    return 'Please use a Gmail address.'
  }

  if (/could not create the user account/i.test(text)) {
    return 'We could not create this user. Please check the details and try again.'
  }

  if (/profile record/i.test(text)) {
    return 'The account was created, but something went wrong while saving the user details. Please refresh and try again.'
  }

  return text
}

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
      
      // Instead of hiding it, we map the Zod errors into a readable list
      const detailedErrors = parsed.map(err => err.message)
      throw new Error(`Please check the following:\n• ` + detailedErrors.join('\n• '))
    } else if (payload?.details && Array.isArray(payload.details) && payload.details.length > 0) {
      // Extract specific field errors from Zod validation
      const detailStr = payload.details.map(d => d.message).join('\n• ')
      throw new Error(`Please check the following:\n• ${detailStr}`)
    } else {
      throw new Error(toPlainLanguageError(payload?.error || 'We could not complete this action. Please try again.'))
    }
  }

  return payload
}

export { API_BASE_URL, request }