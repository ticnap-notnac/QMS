import { supabase } from '@/utils/supabase'

let cachedAuthId = null

if (typeof supabase?.auth?.onAuthStateChange === 'function') {
  supabase.auth.onAuthStateChange((_event, session) => {
    cachedAuthId = session?.user?.id || null
  })
}

export function clearCachedAuthId() {
  cachedAuthId = null
}

export async function getCurrentAuthId() {
  try {
    if (!cachedAuthId) {
      const { data } = await supabase.auth.getUser()
      if (data?.user?.id) cachedAuthId = data.user.id
    }
    return cachedAuthId
  } catch {
    return null
  }
}

export default { getCurrentAuthId, clearCachedAuthId }
