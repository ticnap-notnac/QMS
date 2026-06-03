import { supabase } from '../lib/supabase.js'
import { writeAudit } from '../lib/audit.js'

export async function fetchIssueTypes() {
  const { data, error } = await supabase
    .from('issue_types')
    .select('id, issue_type_name')
    .order('issue_type_name', { ascending: true })

  if (error) throw error
  return data || []
}

export async function createIssueType({ name, userAuthId }) {
  const trimmedName = String(name || '').trim()
  if (!trimmedName) {
    const err = new Error('Issue type name is required.')
    err.status = 400
    throw err
  }

  // Check if issue type already exists (case-insensitive)
  const { data: existing, error: lookupError } = await supabase
    .from('issue_types')
    .select('id, issue_type_name')
    .ilike('issue_type_name', trimmedName)
    .maybeSingle()

  if (lookupError) throw lookupError
  if (existing) return existing

  const { data, error } = await supabase
    .from('issue_types')
    .insert([{ issue_type_name: trimmedName }])
    .select('id, issue_type_name')
    .maybeSingle()

  if (error) throw error

  await writeAudit({
    level: 'audit',
    source: 'issue_types',
    action: 'issue_type_create',
    userAuthId,
    details: { id: data?.id ?? null, issue_type_name: data?.issue_type_name || trimmedName },
  })

  return data
}

export async function deleteIssueType({ id, userAuthId }) {
  const { data: existing, error: lookupError } = await supabase
    .from('issue_types')
    .select('id, issue_type_name')
    .eq('id', id)
    .maybeSingle()

  if (lookupError) throw lookupError
  if (!existing) {
    const err = new Error('Issue type not found.')
    err.status = 404
    throw err
  }

  const { error } = await supabase.from('issue_types').delete().eq('id', id)
  if (error) throw error

  await writeAudit({
    level: 'audit',
    source: 'issue_types',
    action: 'issue_type_delete',
    userAuthId,
    details: { id: existing.id, issue_type_name: existing.issue_type_name || null },
  })

  return { success: true }
}

export default { fetchIssueTypes, createIssueType, deleteIssueType }
