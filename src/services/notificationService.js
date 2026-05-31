import { supabase } from '@/utils/supabase'

export async function fetchUnreadNotifications(currentUserId) {
  if (!currentUserId) return []

  const { data, error } = await supabase
    .from('notifications')
    .select('*')
    .eq('user_id', currentUserId)
    .eq('is_read', false)
    .order('created_at', { ascending: false })

  if (error) {
    throw error
  }

  return data || []
}

export async function fetchUnreadNotificationCount(currentUserId) {
  if (!currentUserId) return 0

  const { count, error } = await supabase
    .from('notifications')
    .select('id', { count: 'exact', head: true })
    .eq('user_id', currentUserId)
    .eq('is_read', false)

  if (error) {
    throw error
  }

  return count || 0
}

export async function markNotificationAsRead(id) {
  const { data, error } = await supabase
    .from('notifications')
    .update({ is_read: true })
    .eq('id', id)
    .select('*')
    .maybeSingle()

  if (error) {
    throw error
  }

  return data || null
}

export default {
  fetchUnreadNotifications,
  fetchUnreadNotificationCount,
  markNotificationAsRead,
}
