import { supabase } from '@/utils/supabase'

export async function getCurrentAuthId() {
  try {
    const { data } = await supabase.auth.getUser()
    return data?.user?.id || null
  } catch (err) {
    return null
  }
}

export default { getCurrentAuthId }
