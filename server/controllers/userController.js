import { hasServiceRole, supabase } from '../lib/supabase.js'

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
  const { error } = await supabase.from('users').delete().eq('id', id)

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  return res.json({ success: true })
}