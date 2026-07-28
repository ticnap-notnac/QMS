// src/service/UserService.js
import { hasServiceRole, supabase } from '../lib/supabase.js'
import { writeAudit } from '../lib/audit.js'

/**
 * Fetches all users enriched with role, department, and site information.
 * @returns {Promise<{ data: object[]|null, error: string|null }>} A promise that resolves to an object containing either the enriched user data array or an error message.
 */
export async function fetchAllUsers() {
  const [usersResult, rolesResult, departmentsResult] = await Promise.all([
    supabase
      .from('users')
      .select('id, first_name, last_name, user_name, email, contact_number, role_id, department_id, auth_id, created_at, status, site_id, position_id')
      .order('created_at', { ascending: false })
      .limit(1000),
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

  const { data: sitesData } = await supabase.from('sites').select('id, site_name, site_code')
  const siteMap = new Map(
    (sitesData || []).map((s) => [String(s.id), { site_name: s.site_name, site_code: s.site_code }])
  )

  const data = (usersResult.data || []).map((user) => ({
    ...user,
    role_name: roleMap.get(String(user.role_id)) || null,
    department_name: departmentMap.get(String(user.department_id)) || null,
    site_name: siteMap.get(String(user.site_id))?.site_name || null,
    site_code: siteMap.get(String(user.site_id))?.site_code || null,
  }))

  return { data, error: null }
}

/**
 * Creates a new user in Supabase Auth and links it to a public user profile.
 * @param {object} fields - The user details.
 * @param {string} fields.firstName - User's first name.
 * @param {string} fields.lastName - User's last name.
 * @param {string} fields.email - User's email address.
 * @param {string} fields.password - User's password.
 * @param {string} [fields.userName] - Optional username.
 * @param {string} [fields.contactNumber] - Optional contact number.
 * @param {number|string} [fields.roleId] - Optional role ID.
 * @param {number|string} [fields.departmentId] - Optional department ID.
 * @param {number|string} [fields.siteId] - Optional site ID.
 * @param {number|string} [fields.positionId] - Optional position ID.
 * @returns {Promise<{ authUser: object|null, profile: object|null, error: string|null, status: number }>} An object containing the created auth user, public profile, error message, and HTTP status code.
 */
export async function createUserWithAuth({ firstName, lastName, email, password, userName, contactNumber, roleId, departmentId, siteId, positionId }) {
  const describeAuthCreateError = (authError) => {
    const message = String(authError?.message || '').toLowerCase()
    const code = String(authError?.code || '').toLowerCase()

    if (
      code === 'user_already_exists' ||
      authError?.status === 409 ||
      message.includes('already registered') ||
      message.includes('already exists') ||
      message.includes('duplicate')
    ) {
      return {
        status: 409,
        error: 'This email is already tied to another account. Please use a different Gmail address.',
      }
    }

    if (message.includes('password') && message.includes('least')) {
      return {
        status: 400,
        error: 'The password is too short. Please use at least 6 characters.',
      }
    }

    if (message.includes('email') && message.includes('invalid')) {
      return {
        status: 400,
        error: 'Please enter a valid Gmail address.',
      }
    }

    if (message.includes('user metadata') || message.includes('metadata')) {
      return {
        status: 400,
        error: 'We could not save the user details. Please check the name, role, department, and site values.',
      }
    }

    return {
      status: authError?.status || 400,
      error: authError?.message || 'We could not create this user. Please check the entered details and try again.',
    }
  }

  const describeProfileError = (profileError) => {
    const message = String(profileError?.message || '').toLowerCase()
    const code = String(profileError?.code || '').toLowerCase()

    if (code === '23502' || message.includes('not-null')) {
      if (message.includes('contact_number')) {
        return {
          status: 422,
          error: 'The contact number field is still required in the database. It should be optional, so please apply the contact-number update.',
        }
      }

      return {
        status: 422,
        error: 'One of the required user details is missing in the database setup. Please check the user table fields.',
      }
    }

    if (code === '23503' || message.includes('foreign key')) {
      return {
        status: 422,
        error: 'One of the selected values is not available in the database. Please choose a valid role, department, or site.',
      }
    }

    if (code === '42501' || message.includes('permission denied') || message.includes('rls')) {
      return {
        status: 403,
        error: 'The system is not allowed to save this user details right now. Please contact support.',
      }
    }

    return {
      status: 500,
      error: 'The account was created, but we could not save the user details. Please refresh and try again.',
    }
  }

  if (!hasServiceRole) {
    return {
      authUser: null,
      profile: null,
      error: 'Server is missing SUPABASE_SERVICE_ROLE_KEY. User creation is disabled until that key is configured.',
      status: 503,
    }
  }

  let authData = null
  let authError = null

  const adminRes = await supabase.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: {
      first_name: firstName,
      last_name: lastName,
      user_name: userName,
      contact_number: contactNumber || null,
      role_id: roleId ? Number(roleId) : null,
      department_id: departmentId ? Number(departmentId) : null,
      site_id: siteId ? Number(siteId) : null,
      position_id: positionId ? Number(positionId) : null,
    },
  })
  authData = adminRes.data
  authError = adminRes.error

  if (authError || !authData?.user) {
    const errStr = String(authError?.message || '').toLowerCase()
    if (!errStr.includes('already registered') && !errStr.includes('already exists')) {
      const signUpRes = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            first_name: firstName,
            last_name: lastName,
            user_name: userName,
            contact_number: contactNumber || null,
            role_id: roleId ? Number(roleId) : null,
            department_id: departmentId ? Number(departmentId) : null,
            site_id: siteId ? Number(siteId) : null,
            position_id: positionId ? Number(positionId) : null,
          }
        }
      })
      if (!signUpRes.error && signUpRes.data?.user) {
        authData = signUpRes.data
        authError = null
      } else if (signUpRes.error) {
        authError = signUpRes.error
      }
    }
  }

  if (authError || !authData?.user) {
    const normalized = describeAuthCreateError(authError)
    return { authUser: null, profile: null, error: normalized.error, status: normalized.status }
  }

  const profileUpdates = {}
  if (siteId) profileUpdates.site_id = Number(siteId)
  if (roleId) profileUpdates.role_id = Number(roleId)
  if (departmentId) profileUpdates.department_id = Number(departmentId)
  if (positionId) profileUpdates.position_id = Number(positionId)
  if (contactNumber) profileUpdates.contact_number = contactNumber
  if (userName) profileUpdates.user_name = userName

  if (Object.keys(profileUpdates).length > 0) {
    await supabase.from('users').update(profileUpdates).eq('auth_id', authData.user.id)
  }

  let { data: profileData, error: profileError } = await supabase
    .from('users')
    .select('id, first_name, last_name, email, contact_number, role_id, department_id, auth_id, site_id, position_id')
    .eq('auth_id', authData.user.id)
    .maybeSingle()

  if (!profileData && !profileError) {
    const { data: createdProfile, error: insertErr } = await supabase
      .from('users')
      .insert([{
        auth_id: authData.user.id,
        email: email,
        first_name: firstName,
        last_name: lastName,
        user_name: userName,
        contact_number: contactNumber || null,
        role_id: roleId ? Number(roleId) : null,
        department_id: departmentId ? Number(departmentId) : null,
        site_id: siteId ? Number(siteId) : null,
        position_id: positionId ? Number(positionId) : null,
        status: 'ACTIVE'
      }])
      .select('id, first_name, last_name, email, contact_number, role_id, department_id, auth_id, site_id, position_id')
      .maybeSingle()
      .select('id, first_name, last_name, email, contact_number, role_id, department_id, auth_id, site_id, position_id')
      .maybeSingle()

    if (!insertErr && createdProfile) {
      profileData = createdProfile
    } else if (insertErr) {
      profileError = insertErr
    }
  }

  if (profileError) {
    const normalized = describeProfileError(profileError)
    return {
      authUser: authData?.user || null,
      profile: null,
      error: normalized.error || profileError.message,
      status: normalized.status || 400,
    }
  }

  if (!profileData) {
    return {
      authUser: authData?.user || null,
      profile: null,
      error: 'The account was created, but the user details were not saved. Please check the users table setup.',
      status: 500,
    }
  }

  return {
    authUser: authData?.user || null,
    profile: profileData,
    error: null,
    status: 200,
  }
}

/**
 * Fetches a single user profile by their unique ID.
 * @param {string} id - The unique identifier of the user.
 * @returns {Promise<{ data: object|null, error: string|null }>} A promise resolving to the user profile data or an error message.
 */
export async function fetchUserById(id) {
  const { data, error } = await supabase
    .from('users')
    .select('id, first_name, last_name, user_name, email, auth_id, position_id')
    .eq('id', id)
    .maybeSingle()

  return { data, error: error?.message || null }
}

/**
 * Deletes a user from both the public profile table and Supabase Auth, and records an audit log.
 * @param {string} id - The unique identifier of the user to delete.
 * @param {string} actorAuthId - The Auth ID of the user performing the deletion.
 * @returns {Promise<{ success: boolean, error: string|null, status: number }>} A promise resolving to an object indicating success, error message, and HTTP status code.
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
 * Updates a user's profile and conditionally updates their Supabase Auth credentials.
 * @param {string} id - The unique identifier of the user to update.
 * @param {object} fields - The fields to update.
 * @param {string} [fields.firstName] - Updated first name.
 * @param {string} [fields.lastName] - Updated last name.
 * @param {string} [fields.email] - Updated email.
 * @param {string} [fields.userName] - Updated username.
 * @param {string} [fields.contactNumber] - Updated contact number.
 * @param {number|string} [fields.roleId] - Updated role ID.
 * @param {number|string} [fields.departmentId] - Updated department ID.
 * @param {number|string} [fields.siteId] - Updated site ID.
 * @param {number|string} [fields.positionId] - Updated position ID.
 * @param {string} [fields.password] - Updated password.
 * @param {string} [fields.status] - Updated account status.
 * @param {string} actorAuthId - The Auth ID of the user performing the update.
 * @returns {Promise<{ profile: object|null, error: string|null, status: number }>} A promise resolving to the updated profile, error message, and HTTP status code.
 */
export async function updateUserById(id, { firstName, lastName, email, userName, contactNumber, roleId, departmentId, siteId, positionId, password, status }, actorAuthId) {
  const { data: existing, error: fetchError } = await supabase
    .from('users')
    .select('id, first_name, last_name, user_name, email, contact_number, role_id, department_id, auth_id, status, site_id, position_id')
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
  if (siteId !== undefined && String(siteId) !== String(existing.site_id ?? '')) updates.site_id = siteId || null
  if (positionId !== undefined && String(positionId) !== String(existing.position_id ?? '')) updates.position_id = positionId || null
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
      .select('id, first_name, last_name, user_name, email, contact_number, role_id, department_id, auth_id, status, site_id, position_id')
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


/**
 * Updates the status of a specific user.
 * @param {string} id - The unique identifier of the user.
 * @param {string} status - The new status to apply to the user.
 * @param {string} actorAuthId - The Auth ID of the user performing the status update.
 * @returns {Promise<{ success: boolean, error: string|null, status: number }>} A promise resolving to an object indicating success, error message, and HTTP status code.
 */
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