import { supabase } from '../lib/supabase.js'

export async function fetchTemplates(actorAuthId) {
  const { data: userProfile, error: userError } = await supabase
    .from('users')
    .select('site_id')
    .eq('auth_id', actorAuthId)
    .maybeSingle()

  if (userError) throw userError

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

  if (userProfile?.site_id) {
    query = query.or(`site_id.is.null,site_id.eq.${userProfile.site_id}`)
  }

  const { data, error } = await query.order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createTemplate({ title, description, standardId, items }, actorAuthId) {
  const { data: userProfile, error: userError } = await supabase
    .from('users')
    .select('site_id')
    .eq('auth_id', actorAuthId)
    .maybeSingle()

  if (userError) throw userError

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

export async function deleteTemplate(id) {
  const { error } = await supabase
    .from('audit_checklist_templates')
    .delete()
    .eq('id', id)

  if (error) throw error
  return { success: true }
}
