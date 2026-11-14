import { supabase } from '@/utils/supabase'

export async function fetchActiveStandards() {
  const { data, error } = await supabase
    .from('iso_standards')
    .select('id, name, version')
    .eq('is_active', true)
    .order('name')
  if (error) throw error
  return data || []
}

export async function fetchClauseGroupsForStandard(standardId) {
  const { data, error } = await supabase
    .from('iso_clause_groups')
    .select('id')
    .eq('standard_id', standardId)
  if (error) throw error
  return data || []
}

export async function fetchClausesCount(groupIds) {
  const { count, error } = await supabase
    .from('iso_clauses')
    .select('id', { count: 'exact', head: true })
    .in('group_id', groupIds)
  if (error) throw error
  return count || 0
}

export async function fetchClausesByGroupIds(groupIds) {
  const { data, error } = await supabase
    .from('iso_clauses')
    .select('id, clause_number, title, description, is_active, group_id')
    .in('group_id', groupIds)
  if (error) throw error
  return data || []
}

export async function fetchCarReports() {
  const { data, error } = await supabase
    .from('car_reports')
    .select('*, audit_schedules(id, title, scheduled_date)')
    .eq('status', 'closed')
    .order('created_at', { ascending: false })
  if (error) throw error

  const { data: usersData } = await supabase
    .from('users')
    .select('id, auth_id, user_name, first_name, last_name')

  const authUserMap = new Map(
    (usersData || [])
      .filter((u) => u.auth_id)
      .map((u) => [
        String(u.auth_id),
        `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.user_name || String(u.auth_id),
      ])
  )

  return (data || []).map((c) => ({
    ...c,
    verified_by_name: c.verified_by ? (authUserMap.get(String(c.verified_by)) || '') : '',
  }))
}

export async function fetchQddrReports() {
  const { data, error } = await supabase
    .from('qddr_reports')
    .select('*')
    .eq('status', 'closed')
    .order('created_at', { ascending: false })
  if (error) throw error

  const { data: usersData } = await supabase
    .from('users')
    .select('id, user_name, first_name, last_name')

  const userMap = new Map(
    (usersData || []).map((u) => [
      Number(u.id),
      `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.user_name || `User #${u.id}`,
    ])
  )

  return (data || []).map((q) => ({
    ...q,
    reported_by_name: q.reported_by ? (userMap.get(Number(q.reported_by)) || String(q.reported_by)) : '',
    leader_name: q.leader ? (userMap.get(Number(q.leader)) || String(q.leader)) : '',
    approved_by_name: q.approved_by ? (userMap.get(Number(q.approved_by)) || String(q.approved_by)) : '',
    noted_by_name: q.noted_by ? (userMap.get(Number(q.noted_by)) || String(q.noted_by)) : '',
  }))
}

export async function fetchAuditRuns() {
  const { data, error } = await supabase
    .from('audit_runs')
    .select('*')
    .not('completed_at', 'is', null)
    .order('completed_at', { ascending: false })
  if (error) throw error
  return data || []
}

export async function fetchAuditSchedules() {
  const { data, error } = await supabase
    .from('audit_schedules')
    .select('id, title, scheduled_date, status, standard_id, auditor_id')
    .order('scheduled_date', { ascending: false })
  if (error) throw error
  return data || []
}

export async function fetchStandardsForAuditMapping() {
  const { data, error } = await supabase
    .from('iso_standards')
    .select('id, name, version')
  if (error) throw error
  return data || []
}

export async function fetchAuditorsForAuditMapping() {
  const { data, error } = await supabase
    .from('users')
    .select('id, first_name, last_name, auth_id')
  if (error) throw error
  return data || []
}
