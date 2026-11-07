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

async function resolveCallerSiteId(userAuthId) {
  if (!userAuthId) return null
  const { data } = await supabase
    .from('users')
    .select('site_id, roles(role_name)')
    .eq('auth_id', userAuthId)
    .maybeSingle()

  if (!data) return null
  if (isAdminRole(data.roles?.role_name)) return null
  return data.site_id || null
}

/**
 * Calculates the compliance percentage for a list of results in a run.
 */
function calculateComplianceScore(results, clauseIdSet) {
  if (!results || results.length === 0) return 100

  const relevantResults = results.filter(r => clauseIdSet.has(r.clause_id))
  if (relevantResults.length === 0) return 100

  const total = relevantResults.length
  const compliant = relevantResults.filter(r => r.status === 'compliant').length
  const na = relevantResults.filter(r => r.status === 'na').length

  const applicable = total - na
  if (applicable <= 0) return 100

  return Math.round((compliant / applicable) * 100)
}

/**
 * Fetches the latest compliance score for all active ISO standards.
 */
export async function fetchComplianceStats(userAuthId = null) {
  const callerSiteId = await resolveCallerSiteId(userAuthId)

  let schedQuery = supabase.from('audit_schedules').select('id, standard_id, site_id')
  if (callerSiteId) {
    schedQuery = schedQuery.or(`site_id.is.null,site_id.eq.${callerSiteId}`)
  }

  const [stdRes, grpRes, clsRes, schedRes, runRes] = await Promise.all([
    supabase.from('iso_standards').select('id, name, version').eq('is_active', true),
    supabase.from('iso_clause_groups').select('id, standard_id'),
    supabase.from('iso_clauses').select('id, group_id').eq('is_active', true),
    schedQuery,
    supabase.from('audit_runs').select('id, schedule_id, completed_at').not('completed_at', 'is', null).order('completed_at', { ascending: false })
  ])

  const standards = stdRes.data || []
  if (standards.length === 0) return []

  const groupToStandard = new Map((grpRes.data || []).map(g => [g.id, g.standard_id]))
  const clausesByStandard = new Map()
  ;(clsRes.data || []).forEach(c => {
    const stdId = groupToStandard.get(c.group_id)
    if (stdId) {
      if (!clausesByStandard.has(stdId)) clausesByStandard.set(stdId, new Set())
      clausesByStandard.get(stdId).add(c.id)
    }
  })

  const scheduleToStandard = new Map((schedRes.data || []).map(s => [s.id, s.standard_id]))
  const latestRunByStandard = new Map()
  ;(runRes.data || []).forEach(r => {
    const stdId = scheduleToStandard.get(r.schedule_id)
    if (stdId && !latestRunByStandard.has(stdId)) {
      latestRunByStandard.set(stdId, r)
    }
  })

  const runIds = Array.from(latestRunByStandard.values()).map(r => r.id)
  const resultsByRun = new Map()
  if (runIds.length > 0) {
    const { data: resultsData } = await supabase
      .from('audit_results')
      .select('run_id, clause_id, status')
      .in('run_id', runIds)

    ;(resultsData || []).forEach(res => {
      if (!resultsByRun.has(res.run_id)) resultsByRun.set(res.run_id, [])
      resultsByRun.get(res.run_id).push(res)
    })
  }

  return standards.map(standard => {
    const lastRun = latestRunByStandard.get(standard.id) || null
    const clauseIdSet = clausesByStandard.get(standard.id) || new Set()
    let score = 100
    if (lastRun) {
      const runResults = resultsByRun.get(lastRun.id) || []
      score = calculateComplianceScore(runResults, clauseIdSet)
    }

    return {
      standard_id: standard.id,
      name: standard.name,
      version: standard.version,
      compliance: score,
      last_run_id: lastRun?.id || null,
      completed_at: lastRun?.completed_at || null
    }
  })
}

/**
 * Fetches historical completed audit runs and their compliance percentages.
 */
export async function fetchComplianceTrends(userAuthId = null) {
  const callerSiteId = await resolveCallerSiteId(userAuthId)

  let schedQuery = supabase.from('audit_schedules').select('id, title, standard_id, site_id')
  if (callerSiteId) {
    schedQuery = schedQuery.or(`site_id.is.null,site_id.eq.${callerSiteId}`)
  }

  const [runRes, schedRes, stdRes, grpRes, clsRes] = await Promise.all([
    supabase.from('audit_runs').select('id, schedule_id, completed_at, started_at').not('completed_at', 'is', null).order('completed_at', { ascending: true }),
    schedQuery,
    supabase.from('iso_standards').select('id, name, version'),
    supabase.from('iso_clause_groups').select('id, standard_id'),
    supabase.from('iso_clauses').select('id, group_id').eq('is_active', true)
  ])

  const runs = runRes.data || []
  if (runs.length === 0) return []

  const schedules = new Map((schedRes.data || []).map(s => [s.id, s]))
  const standards = new Map((stdRes.data || []).map(s => [s.id, s]))

  const groupToStandard = new Map((grpRes.data || []).map(g => [g.id, g.standard_id]))
  const clausesByStandard = new Map()
  ;(clsRes.data || []).forEach(c => {
    const stdId = groupToStandard.get(c.group_id)
    if (stdId) {
      if (!clausesByStandard.has(stdId)) clausesByStandard.set(stdId, new Set())
      clausesByStandard.get(stdId).add(c.id)
    }
  })

  const runIds = runs.map(r => r.id)
  const resultsByRun = new Map()
  if (runIds.length > 0) {
    const { data: resultsData } = await supabase
      .from('audit_results')
      .select('run_id, clause_id, status')
      .in('run_id', runIds)

    ;(resultsData || []).forEach(res => {
      if (!resultsByRun.has(res.run_id)) resultsByRun.set(res.run_id, [])
      resultsByRun.get(res.run_id).push(res)
    })
  }

  const trends = []
  for (const run of runs) {
    const sched = schedules.get(run.schedule_id)
    if (!sched) continue

    const standard = standards.get(sched.standard_id)
    if (!standard) continue

    const clauseIdSet = clausesByStandard.get(standard.id) || new Set()
    const runResults = resultsByRun.get(run.id) || []
    const score = calculateComplianceScore(runResults, clauseIdSet)

    trends.push({
      run_id: run.id,
      title: sched.title,
      standard_name: `${standard.name} (${standard.version})`,
      completed_at: run.completed_at,
      score
    })
  }

  return trends
}
