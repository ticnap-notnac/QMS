import { supabase } from '@/utils/supabase'

function normalizeRoleError(error) {
  if (!error) {
    return error
  }

  const message = error.message || ''
  const code = String(error.code || '')

  if (message.includes('row-level security policy for table "roles"')) {
    return new Error('Roles table is blocking inserts. Add an INSERT policy for public.roles in Supabase.')
  }

  if (message.includes('permission denied') || message.includes('42501')) {
    return new Error('You do not have permission to modify roles. Check Supabase RLS and grants.')
  }

  if (code === '23503' || message.includes('violates foreign key constraint')) {
    return new Error('This role is still assigned to one or more users. Reassign those users before deleting the role.')
  }

  return error
}

export async function loadRoles() {
  const { data, error } = await supabase
    .from('roles')
    .select('id, role_name')
    .order('role_name', { ascending: true })

  if (error) throw error

  return data || []
}

export async function createRole(roleName) {
  const { data, error } = await supabase
    .from('roles')
    .insert([{ role_name: roleName }])

  if (error) throw normalizeRoleError(error)

  return data
}

export async function deleteRole(id) {
  const { error } = await supabase.from('roles').delete().eq('id', id)
  if (error) throw normalizeRoleError(error)
  return true
}
