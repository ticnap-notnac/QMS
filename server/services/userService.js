// src/service/UserService.js
import { hasServiceRole, supabase } from '../lib/supabase.js'
import { writeAudit } from '../lib/audit.js'

/**
 * Fetches all users enriched with role_name and department_name.
 * @returns {{ data: object[]|null, error: string|null }}
 */
export async function fetchAllUsers() {
  const [usersResult, rolesResult, departmentsResult] = await Promise.all([
    supabase
      .from('users')
      .select('id, first_name, last_name, user_name, email, contact_number, role_id, department_id, auth_id, employee_no, created_at, status')
      .order('created_at', { ascending: false }),
    supabase.from('roles').select('id, role_name'),
    supabase.from('departments').select('id, department_name'),
  ])

  if (usersResult.error) {
    return { data: null, error: usersResult.error.message }
  }

  const roleMap = new Map(
    (rolesResult.data || []).map((r) => [String(r.id), r.role_name])
  )
  const departmentMap = new Map(
    (departmentsResult.data || []).map((d) => [String(d.id), d.department_name])
  )

  const data = (usersResult.data || []).map((user) => ({
    ...user,
    role_name: roleMap.get(String(user.role_id)) || null,
    department_name: departmentMap.get(String(user.department_id)) || null,
  }))

  return { data, error: null }
}

/**
 * Creates an auth user and returns its linked profile row.
 * @param {object} fields
 * @returns {{ authUser: object|null, profile: object|null, error: string|null, status: number }}
 */
export async function createUserWithAuth({ firstName, lastName, email, password, userName, contactNumber, roleId, departmentId }) {
  if (!hasServiceRole) {
    return {
      authUser: null,
      profile: null,
      error: 'Server is missing SUPABASE_SERVICE_ROLE_KEY. User creation is disabled until that key is configured.',
      status: 503,
    }
  }

  const { data: authData, error: authError } = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      first_name: firstName,
      last_name: lastName,
      user_name: userName,
      contact_number: contactNumber || null,
      role_id: roleId || null,
      department_id: departmentId || null,
    },
  })

  if (authError) {
    return { authUser: null, profile: null, error: authError.message, status: 500 }
  }

  const { data: profileData, error: profileError } = await supabase
    .from('users')
    .select('id, first_name, last_name, email, contact_number, role_id, department_id, auth_id, employee_no')
    .eq('email', email)
    .maybeSingle()

  return {
    authUser: authData?.user || null,
    profile: profileError ? null : profileData || null,
    error: null,
    status: 200,
  }
}

/**
 * Fetches a single user profile by primary key.
 * @param {string} id
 * @returns {{ data: object|null, error: string|null }}
 */
export async function fetchUserById(id) {
  const { data, error } = await supabase
    .from('users')
    .select('id, first_name, last_name, user_name, email, auth_id')
    .eq('id', id)
    .maybeSingle()

  return { data, error: error?.message || null }
}

/**
 * Deletes a user from public.users and Supabase Auth, then writes an audit log.
 * @param {string} id - Profile PK
 * @param {string} actorAuthId - Auth ID of the requesting admin
 * @returns {{ success: boolean, error: string|null, status: number }}
 */
export async function deleteUserById(id, actorAuthId) {
  const { data: existing, error: fetchError } = await fetchUserById(id)

  if (fetchError) return { success: false, error: fetchError, status: 500 }
  if (!existing) return { success: false, error: 'User not found.', status: 404 }
  if (!existing.auth_id) {
    return {
      success: false,
      error: 'This user is missing auth_id. Delete the auth account manually or repair the profile row linkage.',
      status: 500,
    }
  }

  const { error: dbError } = await supabase.from('users').delete().eq('id', id)
  if (dbError) return { success: false, error: dbError.message, status: 500 }

  const { error: authError } = await supabase.auth.admin.deleteUser(existing.auth_id)
  if (authError) return { success: false, error: authError.message, status: 500 }

  const displayName =
    `${existing.first_name || ''} ${existing.last_name || ''}`.trim() ||
    existing.user_name ||
    existing.email

  try {
    await writeAudit({
      source: 'users',
      action: 'user_delete',
      userAuthId: actorAuthId,
      details: { id: existing.id ?? id, deleted_auth_id: existing.auth_id, deleted_display: displayName },
    })
  } catch (logErr) {
    console.warn('Failed to record user_delete log:', logErr?.message || logErr)
  }

  return { success: true, error: null, status: 200 }
}

/**
 * Updates profile fields and optionally syncs email/password to Supabase Auth.
 * @param {string} id - Profile PK
 * @param {object} fields
 * @param {string} actorAuthId - Auth ID of the requesting admin
 * @returns {{ profile: object|null, error: string|null, status: number }}
 */
export async function updateUserById(id, { firstName, lastName, email, userName, contactNumber, roleId, departmentId, password, status }, actorAuthId) {
  const { data: existing, error: fetchError } = await supabase
    .from('users')
    .select('id, first_name, last_name, user_name, email, contact_number, role_id, department_id, auth_id, status')
    .eq('id', id)
    .maybeSingle()

  if (fetchError) return { profile: null, error: fetchError.message, status: 500 }
  if (!existing) return { profile: null, error: 'User not found.', status: 404 }

  const updates = {}
  if (firstName !== undefined && firstName !== (existing.first_name || '')) updates.first_name = firstName
  if (lastName !== undefined && lastName !== (existing.last_name || '')) updates.last_name = lastName
  if (userName !== undefined && userName !== (existing.user_name || '')) updates.user_name = userName
  if (contactNumber !== undefined && contactNumber !== (existing.contact_number || '')) updates.contact_number = contactNumber
  if (roleId !== undefined && String(roleId) !== String(existing.role_id)) updates.role_id = roleId || null
  if (departmentId !== undefined && String(departmentId) !== String(existing.department_id)) updates.department_id = departmentId || null
  if (email !== undefined && email !== (existing.email || '')) updates.email = email
  if (status !== undefined && status !== (existing.status || '')) {
    const VALID_STATUSES = ['ACTIVE', 'INACTIVE', 'DEACTIVATED', 'Active', 'Inactive', 'Deactivated']
    if (VALID_STATUSES.includes(status)) {
      updates.status = status.toUpperCase()
    }
  }

  let updatedProfile = existing

  if (Object.keys(updates).length > 0) {
    const { data: profileData, error: profileError } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select('id, first_name, last_name, user_name, email, contact_number, role_id, department_id, auth_id, employee_no, status')
      .maybeSingle()

    if (profileError) return { profile: null, error: profileError.message, status: 500 }
    updatedProfile = profileData || updatedProfile
  }

  if (hasServiceRole && existing.auth_id && (password || (email && email !== existing.email))) {
    const adminUpdate = {}
    if (password) adminUpdate.password = password
    if (email && email !== existing.email) adminUpdate.email = email

    const { error: authErr } = await supabase.auth.admin.updateUserById(existing.auth_id, adminUpdate)
    if (authErr) return { profile: null, error: authErr.message, status: 500 }
  }

  try {
    await writeAudit({
      source: 'users',
      action: 'user_update',
      userAuthId: actorAuthId,
      details: { id, updates },
    })
  } catch (logErr) {
    console.warn('Failed to record user_update log:', logErr?.message || logErr)
  }

  return { profile: updatedProfile, error: null, status: 200 }
}


export async function updateUserStatusById(id, status, actorAuthId) {
  const VALID_STATUSES = ['Active', 'Inactive', 'Deactivated', 'ACTIVE', 'INACTIVE', 'DEACTIVATED']

  if (!VALID_STATUSES.includes(status)) {
    return { success: false, error: `Invalid status. Must be one of: ${VALID_STATUSES.join(', ')}.`, status: 400 }
  }

  const { error: dbError } = await supabase
    .from('users')
    .update({ status: status.toUpperCase() })
    .eq('id', id)

  if (dbError) return { success: false, error: dbError.message, status: 500 }

  try {
    await writeAudit({
      source: 'users',
      action: 'user_status_update',
      userAuthId: actorAuthId,
      details: { id, status: status.toUpperCase() },
    })
  } catch (logErr) {
    console.warn('Failed to record user_status_update log:', logErr?.message || logErr)
  }

  return { success: true, error: null, status: 200 }
}