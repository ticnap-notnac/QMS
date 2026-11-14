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
  const [
    { data, error },
    { data: usersData },
    { data: ratingsData },
    { data: authSessionData }
  ] = await Promise.all([
    supabase
      .from('car_reports')
      .select('*, audit_schedules(id, title, scheduled_date)')
      .eq('status', 'closed')
      .order('created_at', { ascending: false }),
    supabase
      .from('users')
      .select('id, auth_id, user_name, first_name, last_name'),
    supabase
      .from('report_ratings')
      .select('report_type, report_id, user_auth_id, rating')
      .eq('report_type', 'CAR'),
    supabase.auth.getUser()
  ])
  if (error) throw error

  const currentAuthId = authSessionData?.user?.id || ''

  const authUserMap = new Map(
    (usersData || [])
      .filter((u) => u.auth_id)
      .map((u) => [
        String(u.auth_id),
        `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.user_name || String(u.auth_id),
      ])
  )

  const statsByCarId = new Map()
  for (const row of ratingsData || []) {
    const idKey = Number(row.report_id)
    if (!statsByCarId.has(idKey)) {
      statsByCarId.set(idKey, { sum: 0, count: 0, myRating: null })
    }
    const entry = statsByCarId.get(idKey)
    const val = Number(row.rating)
    if (val >= 1 && val <= 5) {
      entry.sum += val
      entry.count += 1
      if (currentAuthId && String(row.user_auth_id) === String(currentAuthId)) {
        entry.myRating = val
      }
    }
  }

  return (data || []).map((c) => {
    const stats = statsByCarId.get(Number(c.id))
    const count = stats?.count ?? Number(c.ratings_count || 0)
    const avg = stats && stats.count > 0
      ? Number((stats.sum / stats.count).toFixed(2))
      : (c.average_rating != null ? Number(c.average_rating) : null)
    return {
      ...c,
      verified_by_name: c.verified_by ? (authUserMap.get(String(c.verified_by)) || '') : '',
      my_rating: stats?.myRating ?? c.my_rating ?? null,
      average_rating: avg,
      ratings_count: count,
    }
  })
}

export async function fetchQddrReports() {
  const [
    { data, error },
    { data: usersData },
    { data: ratingsData },
    { data: authSessionData }
  ] = await Promise.all([
    supabase
      .from('qddr_reports')
      .select('*')
      .eq('status', 'closed')
      .order('created_at', { ascending: false }),
    supabase
      .from('users')
      .select('id, user_name, first_name, last_name'),
    supabase
      .from('report_ratings')
      .select('report_type, report_id, user_auth_id, rating')
      .eq('report_type', 'QDDR'),
    supabase.auth.getUser()
  ])
  if (error) throw error

  const currentAuthId = authSessionData?.user?.id || ''

  const userMap = new Map(
    (usersData || []).map((u) => [
      Number(u.id),
      `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.user_name || `User #${u.id}`,
    ])
  )

  const statsByQddrId = new Map()
  for (const row of ratingsData || []) {
    const idKey = Number(row.report_id)
    if (!statsByQddrId.has(idKey)) {
      statsByQddrId.set(idKey, { sum: 0, count: 0, myRating: null })
    }
    const entry = statsByQddrId.get(idKey)
    const val = Number(row.rating)
    if (val >= 1 && val <= 5) {
      entry.sum += val
      entry.count += 1
      if (currentAuthId && String(row.user_auth_id) === String(currentAuthId)) {
        entry.myRating = val
      }
    }
  }

  return (data || []).map((q) => {
    const stats = statsByQddrId.get(Number(q.id))
    const count = stats?.count ?? Number(q.ratings_count || 0)
    const avg = stats && stats.count > 0
      ? Number((stats.sum / stats.count).toFixed(2))
      : (q.average_rating != null ? Number(q.average_rating) : null)
    return {
      ...q,
      reported_by_name: q.reported_by ? (userMap.get(Number(q.reported_by)) || String(q.reported_by)) : '',
      leader_name: q.leader ? (userMap.get(Number(q.leader)) || String(q.leader)) : '',
      approved_by_name: q.approved_by ? (userMap.get(Number(q.approved_by)) || String(q.approved_by)) : '',
      noted_by_name: q.noted_by ? (userMap.get(Number(q.noted_by)) || String(q.noted_by)) : '',
      my_rating: stats?.myRating ?? q.my_rating ?? null,
      average_rating: avg,
      ratings_count: count,
    }
  })
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
