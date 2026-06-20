import { supabase } from '@/utils/supabase'

let cachedAuthId = null

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

export default { getCurrentAuthId }
