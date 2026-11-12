import { supabase } from '../lib/supabase.js'

function isAdminRole(roleName) {
  const norm = String(roleName || '').trim().toLowerCase()
  if (!norm) return false
  return (
    norm === 'admin' ||
    norm === 'super admin' ||
    norm === 'super_admin' ||
    norm === 'system administrator' ||
    norm === 'system_administrator' ||
    norm === 'administrator' ||
    norm === 'superadmin'
  )
}

async function resolveActorProfile(actorAuthId) {
  if (!actorAuthId) return null
  const { data, error } = await supabase
    .from('users')
    .select('id, site_id, roles(role_name)')
    .eq('auth_id', actorAuthId)
    .maybeSingle()

  if (error) throw error
  if (!data) return null
  return {
    id: data.id,
    site_id: data.site_id || null,
    role_name: data.roles?.role_name || null
  }
}

export async function fetchTemplates(actorAuthId) {
  const userProfile = await resolveActorProfile(actorAuthId)

  let query = supabase
    .from('audit_checklist_templates')
    .select(`
      *,
      iso_standards (id, name, version),
      audit_checklist_items (
        id,
        clause_id,
        requirement,
        what_to_look_for,
        iso_clauses (id, clause_number, title)
      )
    `)

  if (userProfile?.site_id && !isAdminRole(userProfile.role_name)) {
    query = query.or(`site_id.is.null,site_id.eq.${userProfile.site_id}`)
  }

  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createTemplate({ title, description, standardId, items }, actorAuthId) {
  const userProfile = await resolveActorProfile(actorAuthId)

  const { data: template, error: tempError } = await supabase
    .from('audit_checklist_templates')
    .insert({
      title,
      description,
      standard_id: standardId || null,
      created_by: actorAuthId,
      site_id: userProfile?.site_id || null
    })
    .select()
    .single()

  if (tempError) throw tempError

  if (items && items.length > 0) {
    const checklistItems = items.map(item => ({
      template_id: template.id,
      clause_id: item.clause_id || null,
      requirement: item.requirement || '',
      what_to_look_for: item.what_to_look_for || ''
    }))

    const { error: itemsError } = await supabase
      .from('audit_checklist_items')
      .insert(checklistItems)

    if (itemsError) throw itemsError
  }

  return template
}

export async function updateTemplate(id, { title, description, standardId, items }, actorAuthId) {
  const { data: existing, error: findErr } = await supabase
    .from('audit_checklist_templates')
    .select('id, site_id')
    .eq('id', id)
    .maybeSingle()

  if (findErr) throw findErr
  if (!existing) {
    const err = new Error('Checklist template not found.')
    err.status = 404
    throw err
  }

  const userProfile = await resolveActorProfile(actorAuthId)
  if (userProfile && !isAdminRole(userProfile.role_name) && userProfile.site_id && existing.site_id && String(userProfile.site_id) !== String(existing.site_id)) {
    const err = new Error('You can only update checklist templates belonging to your assigned site.')
    err.status = 403
    throw err
  }

  const { data: template, error: tempError } = await supabase
    .from('audit_checklist_templates')
    .update({
      title,
      description,
      standard_id: standardId || null
    })
    .eq('id', id)
    .select()
    .single()

  if (tempError) throw tempError

  const { error: deleteError } = await supabase
    .from('audit_checklist_items')
    .delete()
    .eq('template_id', id)

  if (deleteError) throw deleteError

  if (items && items.length > 0) {
    const checklistItems = items.map(item => ({
      template_id: id,
      clause_id: item.clause_id || null,
      requirement: item.requirement || '',
      what_to_look_for: item.what_to_look_for || ''
    }))

    const { error: itemsError } = await supabase
      .from('audit_checklist_items')
      .insert(checklistItems)

    if (itemsError) throw itemsError
  }

  return template
}

export async function deleteTemplate(id, actorAuthId = null) {
  const { data: existing, error: findErr } = await supabase
    .from('audit_checklist_templates')
    .select('id, site_id')
    .eq('id', id)
    .maybeSingle()

  if (findErr) throw findErr
  if (!existing) {
    const err = new Error('Checklist template not found.')
    err.status = 404
    throw err
  }

  const userProfile = await resolveActorProfile(actorAuthId)
  if (userProfile && !isAdminRole(userProfile.role_name) && userProfile.site_id && existing.site_id && String(userProfile.site_id) !== String(existing.site_id)) {
    const err = new Error('You can only delete checklist templates belonging to your assigned site.')
    err.status = 403
    throw err
  }

  // Clear any schedule references and cascade delete child items safely
  await supabase
    .from('audit_schedules')
    .update({ template_id: null })
    .eq('template_id', id)

  await supabase
    .from('audit_checklist_items')
    .delete()
    .eq('template_id', id)

  const { error } = await supabase
    .from('audit_checklist_templates')
    .delete()
    .eq('id', id)

  if (error) throw error
  return { success: true }
}
