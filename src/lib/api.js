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

  const text = await response.text()
  const contentType = response.headers.get('content-type') || ''
  let payload = text
  if (contentType.includes('application/json') && text.trim()) {
    try {
      payload = JSON.parse(text)
    } catch {
      payload = text
    }
  }

  if (!response.ok) {
    if (typeof payload === 'object' && payload !== null) {
      if (Array.isArray(payload.details) && payload.details.length > 0) {
        const detailStr = payload.details.map(d => d.message || JSON.stringify(d)).filter(Boolean).join('\n• ')
        throw new Error(`Please check the following:\n• ${detailStr}`)
      }
      throw new Error(toPlainLanguageError(payload.error || payload.message || 'We could not complete this action. Please try again.'))
    }

    if (typeof payload === 'string' && payload.trim()) {
      try {
        const parsed = JSON.parse(payload)
        if (Array.isArray(parsed.details) && parsed.details.length > 0) {
          const detailStr = parsed.details.map(d => d.message || JSON.stringify(d)).filter(Boolean).join('\n• ')
          throw new Error(`Please check the following:\n• ${detailStr}`)
        }
        if (parsed.error || parsed.message) {
          throw new Error(toPlainLanguageError(parsed.error || parsed.message))
        }
      } catch (jsonErr) {
        if (jsonErr.message && jsonErr.message.startsWith('Please check') || jsonErr.message !== payload) {
          // Rethrow formatted Error if it was thrown above
          if (jsonErr instanceof Error && !jsonErr.message.includes('JSON.parse')) {
            throw jsonErr
          }
        }
      }
      throw new Error(toPlainLanguageError(payload))
    }

    throw new Error('We could not complete this action. Please try again.')
  }

  return payload
}

export { API_BASE_URL, request }