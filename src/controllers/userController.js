import { supabase } from '@/utils/supabase'

export async function createUser({
  firstName,
  lastName,
  email,
  password,
  userName,
  contactNumber,
  roleId,
  departmentId,
}) {
  if (!firstName || !lastName || !email || !password || !userName || !departmentId) {
    throw new Error('First name, last name, email, password, username, and department are required.')
  }

  const { data: sessionData, error: sessionError } = await supabase.auth.getSession()
  if (sessionError) {
    throw new Error(`Unable to read current admin session: ${sessionError.message}`)
  }

  const adminSession = sessionData?.session || null

  let authData, authError
  try {
    const res = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          first_name: firstName,
          last_name: lastName,
          user_name: userName,
          contact_number: contactNumber || null,
          role_id: roleId || null,
          department_id: departmentId || null,
        },
      },
    })
    authData = res.data
    authError = res.error
  } catch (err) {
    throw new Error(`Signup failed: ${err?.message || err}`)
  }

  if (authError) {
    const msg = String(authError?.message || authError)
    // map known DB/constraint issues to a friendlier message
    if (msg.includes('users_email_key') || /unique\s*\(email\)/i.test(msg) || msg.includes('duplicate key') && msg.includes('email')) {
      throw new Error('Could not create user: email already in use.')
    }
    if (msg.includes('users_contact_number_key') || /unique\s*\(contact_number\)/i.test(msg) || (msg.includes('duplicate key') && msg.includes('contact'))) {
      throw new Error('Could not create user: contact number already in use.')
    }
    if (msg.includes('users_employee_no_key') || /unique\s*\(employee_no\)/i.test(msg) || (msg.includes('duplicate key') && msg.includes('employee_no'))) {
      throw new Error('Could not create user: generated employee number conflict.')
    }
    if (msg.includes('Database error saving new user') || msg.includes('unique constraint')) {
      throw new Error('Could not create user: a unique constraint prevented creation.')
    }
    throw authError
  }

  const authUser = authData?.user

  if (!authUser?.id) {
    throw new Error('Supabase did not return a new user record.')
  }

  // If signUp created a session for the new user, restore the admin session immediately.
  if (adminSession) {
    const { error: restoreError } = await supabase.auth.setSession({
      access_token: adminSession.access_token,
      refresh_token: adminSession.refresh_token,
    })

    if (restoreError) {
      throw new Error(`Created the user, but failed to restore admin session: ${restoreError.message}`)
    }
  }

  // Try to load the created profile row (trigger should create it). If RLS prevents this, ignore the error.
  let profile = null
  try {
    const { data: profileData, error: profileError } = await supabase
      .from('users')
      .select('id,first_name,last_name,email,contact_number,role_id,department_id,auth_id,employee_no')
      .eq('email', email)
      .maybeSingle()
    if (!profileError && profileData) profile = profileData
  } catch (err) {
    // swallow - not critical for signup success
  }

  return {
    authUser,
    profile,
  }
}

// backwards-compatible alias
export { createUser as createAdminUser }
