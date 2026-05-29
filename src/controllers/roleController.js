import { request } from '@/lib/api'

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
  return await request('/roles')
}

export async function createRole(roleName) {
  try {
    const data = await request('/roles', { method: 'POST', body: JSON.stringify({ roleName }) })
    return data
  } catch (err) {
    throw normalizeRoleError(err)
  }
}

export async function deleteRole(id) {
  try {
    await request(`/roles/${id}`, { method: 'DELETE' })
    return true
  } catch (err) {
    throw normalizeRoleError(err)
  }
}
