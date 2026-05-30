import { hasServiceRole, supabase } from '../lib/supabase.js'
import { writeAudit } from '../lib/audit.js'
import { getRequestActor } from '../lib/requestUtils.js'

export async function getUsers(_req, res) {
  const { data, error } = await supabase
    .from('users')
    .select('id, first_name, last_name, user_name, email, contact_number, role_id, department_id, auth_id, employee_no, created_at')
    .order('created_at', { ascending: false })

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  return res.json(data || [])
}

export async function createUser(req, res) {
  const {
    firstName,
    lastName,
    email,
    password,
    userName,
    contactNumber,
    roleId,
    departmentId,
  } = req.body || {}

  if (!firstName || !lastName || !email || !password || !userName || !departmentId) {
    return res.status(400).json({ error: 'First name, last name, email, password, username, and department are required.' })
  }

  if (!hasServiceRole) {
    return res.status(503).json({ error: 'Server is missing SUPABASE_SERVICE_ROLE_KEY. User creation is disabled until that key is configured.' })
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
    return res.status(500).json({ error: authError.message })
  }

  const authUser = authData?.user || null

  const { data: profileData, error: profileError } = await supabase
    .from('users')
    .select('id,first_name,last_name,email,contact_number,role_id,department_id,auth_id,employee_no')
    .eq('email', email)
    .maybeSingle()

  return res.json({
    authUser,
    profile: profileError ? null : profileData || null,
  })
}

export async function deleteUser(req, res) {
  const { id } = req.params
  // Fetch the profile row first so we can delete the matching Supabase Auth user.
  const { data: existing, error: fetchError } = await supabase
    .from('users')
    .select('id, first_name, last_name, user_name, email, auth_id')
    .eq('id', id)
    .maybeSingle()

  if (fetchError) {
    return res.status(500).json({ error: fetchError.message })
  }

  if (!existing) {
    return res.status(404).json({ error: 'User not found.' })
  }

  const authUserId = existing.auth_id

  if (!authUserId) {
    return res.status(500).json({ error: 'This user is missing auth_id. Delete the auth account manually or repair the profile row linkage.' })
  }

  // Step 1: Delete from the public users table.
  const { error: dbError } = await supabase
    .from('users')
    .delete()
    .eq('id', id)

  if (dbError) {
    return res.status(500).json({ error: dbError.message })
  }

  // Step 2: Delete from Supabase Auth.
  const { error: authError } = await supabase.auth.admin.deleteUser(authUserId)

  if (authError) {
    return res.status(500).json({ error: authError.message })
  }

  // record audit log (non-blocking)
  try {
    const userAuthId = getRequestActor(req)
    const displayName = existing ? `${existing.first_name || ''} ${existing.last_name || ''}`.trim() || existing.user_name || existing.email : null
    await writeAudit({ source: 'users', action: 'user_delete', userAuthId, details: { id: existing?.id ?? id, deleted_auth_id: authUserId, deleted_display: displayName } })
  } catch (logErr) {
    console.warn('Failed to record user_delete log:', logErr?.message || logErr)
  }

  return res.json({ success: true })
}

export async function updateUser(req, res) {
  const { id } = req.params
  const {
    firstName,
    lastName,
    email,
    userName,
    contactNumber,
    roleId,
    departmentId,
    password,
  } = req.body || {}

  // Fetch existing profile row
  const { data: existing, error: fetchError } = await supabase
    .from('users')
    .select('id, first_name, last_name, user_name, email, contact_number, role_id, department_id, auth_id')
    .eq('id', id)
    .maybeSingle()

  if (fetchError) {
    return res.status(500).json({ error: fetchError.message })
  }

  if (!existing) {
    return res.status(404).json({ error: 'User not found.' })
  }

  const authUserId = existing.auth_id

  // Build update payload only for changed/defined fields
  const updates = {}
  if (firstName !== undefined && firstName !== (existing.first_name || '')) updates.first_name = firstName
  if (lastName !== undefined && lastName !== (existing.last_name || '')) updates.last_name = lastName
  if (userName !== undefined && userName !== (existing.user_name || '')) updates.user_name = userName
  if (contactNumber !== undefined && contactNumber !== (existing.contact_number || '')) updates.contact_number = contactNumber
  if (roleId !== undefined && String(roleId) !== String(existing.role_id)) updates.role_id = roleId || null
  if (departmentId !== undefined && String(departmentId) !== String(existing.department_id)) updates.department_id = departmentId || null
  if (email !== undefined && email !== (existing.email || '')) updates.email = email

  // Update public.users profile row if there are changes
  let updatedProfile = existing
  if (Object.keys(updates).length > 0) {
    const { data: profileData, error: profileError } = await supabase
      .from('users')
      .update(updates)
      .eq('id', id)
      .select('id, first_name, last_name, user_name, email, contact_number, role_id, department_id, auth_id, employee_no')
      .maybeSingle()

    if (profileError) {
      return res.status(500).json({ error: profileError.message })
    }

    updatedProfile = profileData || updatedProfile
  }

  // Update Supabase Auth for email/password if needed (requires service role)
  if (hasServiceRole && authUserId && (password || (email && email !== existing.email))) {
    const adminUpdate = {}
    if (password) adminUpdate.password = password
    if (email && email !== existing.email) adminUpdate.email = email

    const { error: authErr } = await supabase.auth.admin.updateUserById(authUserId, adminUpdate)
    if (authErr) {
      return res.status(500).json({ error: authErr.message })
    }
  }

  // record audit log (non-blocking)
  try {
    const userAuthId = getRequestActor(req)
    await writeAudit({ source: 'users', action: 'user_update', userAuthId, details: { id, updates } })
  } catch (logErr) {
    console.warn('Failed to record user_update log:', logErr?.message || logErr)
  }

  return res.json({ profile: updatedProfile })
}