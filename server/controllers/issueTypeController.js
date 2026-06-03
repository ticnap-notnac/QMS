import { supabase } from '../lib/supabase.js'
import { writeAudit } from '../lib/audit.js'
import { getRequestActor } from '../lib/requestUtils.js'

function normalizeIssueTypeName(value) {
  return String(value || '').trim()
}

export async function getIssueTypes(_req, res) {
  const { data, error } = await supabase
    .from('issue_types')
    .select('id, issue_type_name')
    .order('issue_type_name', { ascending: true })

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  return res.json(data || [])
}

export async function createIssueType(req, res) {
  const issueTypeName = normalizeIssueTypeName(req.body?.issueTypeName || req.body?.issue_type_name)

  if (!issueTypeName) {
    return res.status(400).json({ error: 'Issue type name is required.' })
  }

  const { data: existing, error: lookupError } = await supabase
    .from('issue_types')
    .select('id, issue_type_name')
    .ilike('issue_type_name', issueTypeName)
    .maybeSingle()

  if (lookupError) {
    return res.status(500).json({ error: lookupError.message })
  }

  if (existing) {
    return res.status(200).json(existing)
  }

  const { data, error } = await supabase
    .from('issue_types')
    .insert([{ issue_type_name: issueTypeName }])
    .select('id, issue_type_name')
    .maybeSingle()

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  try {
    await writeAudit({
      level: 'audit',
      source: 'issue_types',
      action: 'issue_type_create',
      userAuthId: getRequestActor(req),
      details: { id: data?.id ?? null, issue_type_name: data?.issue_type_name || issueTypeName },
    })
  } catch (auditError) {
    console.warn('Failed to record issue_type_create audit:', auditError?.message || auditError)
  }

  return res.status(201).json(data)
}

export async function deleteIssueType(req, res) {
  const { id } = req.params

  const { data: existing, error: lookupError } = await supabase
    .from('issue_types')
    .select('id, issue_type_name')
    .eq('id', id)
    .maybeSingle()

  if (lookupError) {
    return res.status(500).json({ error: lookupError.message })
  }

  if (!existing) {
    return res.status(404).json({ error: 'Issue type not found.' })
  }

  const { error } = await supabase.from('issue_types').delete().eq('id', id)

  if (error) {
    return res.status(500).json({ error: error.message })
  }

  try {
    await writeAudit({
      level: 'audit',
      source: 'issue_types',
      action: 'issue_type_delete',
      userAuthId: getRequestActor(req),
      details: { id: existing.id, issue_type_name: existing.issue_type_name || null },
    })
  } catch (auditError) {
    console.warn('Failed to record issue_type_delete audit:', auditError?.message || auditError)
  }

  return res.json({ success: true })
}
