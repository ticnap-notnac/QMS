import { request } from '@/lib/api'
import { insertLog } from '@/services/logService'
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
  return await request('/roles')
}

export async function createRole(roleName) {
  try {
    const data = await request('/roles', { method: 'POST', body: JSON.stringify({ roleName }) })
    try {
      // include current user's auth id when available so server can enrich user_display
      let userAuthId = null
      try {
        const { data: { user } } = await supabase.auth.getUser()
        userAuthId = user?.id || null
      } catch (e) {
        // ignore
      }

      await insertLog({
        level: 'audit',
        source: 'roles',
        action: 'role_create',
        userAuthId,
        details: { id: Array.isArray(data) ? data[0]?.id ?? null : data?.id ?? null, roleName }
      })
    } catch (err) {
      console.warn('Failed to insert role_create log', err?.message || err)
    }
    return data
  } catch (err) {
    throw normalizeRoleError(err)
  }
}

export async function deleteRole(id) {
  try {
    let userAuthId = null
    try {
      const { data: { user } } = await supabase.auth.getUser()
      userAuthId = user?.id || null
    } catch (e) {
      // ignore
    }

    await request(`/roles/${id}`, { method: 'DELETE', body: JSON.stringify({ userAuthId }) })
    return true
  } catch (err) {
    throw normalizeRoleError(err)
  }
}

export async function updateRole(id, roleName) {
  try {
    const data = await request(`/roles/${id}`, { method: 'PUT', body: JSON.stringify({ roleName }) })
    return data
  } catch (err) {
    throw normalizeRoleError(err)
  }
}
