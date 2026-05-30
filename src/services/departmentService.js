import { request } from '@/lib/api'
import { insertLog } from '@/services/logService'
import { supabase } from '@/utils/supabase'

export async function loadDepartments() {
  return await request('/departments')
}

export async function createDepartment(departmentName) {
  const data = await request('/departments', { method: 'POST', body: JSON.stringify({ departmentName }) })
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
      source: 'departments',
      action: 'department_create',
      userAuthId,
      details: { id: Array.isArray(data) ? data[0]?.id ?? null : data?.id ?? null, departmentName }
    })
  } catch (err) {
    console.warn('Failed to insert department_create log', err?.message || err)
  }
  return data
}

export async function deleteDepartment(id) {
  let userAuthId = null
  try {
    const { data: { user } } = await supabase.auth.getUser()
    userAuthId = user?.id || null
  } catch (e) {
    // ignore
  }

  await request(`/departments/${id}`, { method: 'DELETE', body: JSON.stringify({ userAuthId }) })
  return true
}
