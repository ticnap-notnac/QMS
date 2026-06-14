import { supabase } from '../lib/supabase.js'

/**
 * Calculates the compliance percentage for a list of results in a run.
 */
function calculateComplianceScore(results, clauses) {
  if (!results || results.length === 0) return 100

  // Only consider results for active clauses belonging to this standard
  const activeClauseIds = new Set(clauses.map(c => c.id))
  const relevantResults = results.filter(r => activeClauseIds.has(r.clause_id))

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
export async function fetchComplianceStats() {
  // 1. Fetch active standards
  const { data: standards, error: stdErr } = await supabase
    .from('iso_standards')
    .select('id, name, version')
    .eq('is_active', true)

  if (stdErr) throw stdErr

  if (!standards || standards.length === 0) {
    return []
  }

  const stats = []

  for (const standard of standards) {
    // 2. Fetch clauses
    const { data: groups, error: grpErr } = await supabase
      .from('iso_clause_groups')
      .select('id')
      .eq('standard_id', standard.id)

    if (grpErr) throw grpErr

    const groupIds = (groups || []).map(g => g.id)

    let clauses = []
    if (groupIds.length > 0) {
      const { data: clausesData, error: clsErr } = await supabase
        .from('iso_clauses')
        .select('id')
        .in('group_id', groupIds)
        .eq('is_active', true)

      if (clsErr) throw clsErr
      clauses = clausesData || []
    }

    // 3. Find latest completed run for this standard
    const { data: schedules, error: schedErr } = await supabase
      .from('audit_schedules')
      .select('id')
      .eq('standard_id', standard.id)

    if (schedErr) throw schedErr

    const scheduleIds = (schedules || []).map(s => s.id)

    let score = 100
    let lastRun = null

    if (scheduleIds.length > 0) {
      const { data: runs, error: runErr } = await supabase
        .from('audit_runs')
        .select('id, completed_at')
        .in('schedule_id', scheduleIds)
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })
        .limit(1)

      if (runErr) throw runErr

      if (runs && runs.length > 0) {
        lastRun = runs[0]
        // Fetch results for this run
        const { data: results, error: resErr } = await supabase
          .from('audit_results')
          .select('clause_id, status')
          .eq('run_id', lastRun.id)

        if (resErr) throw resErr
        score = calculateComplianceScore(results, clauses)
      }
    }

    stats.push({
      standard_id: standard.id,
      name: standard.name,
      version: standard.version,
      compliance: score,
      last_run_id: lastRun?.id || null,
      completed_at: lastRun?.completed_at || null
    })
  }

  return stats
}

/**
 * Fetches historical completed audit runs and their compliance percentages.
 */
export async function fetchComplianceTrends() {
  // 1. Fetch completed audit runs
  const { data: runs, error: runErr } = await supabase
    .from('audit_runs')
    .select('id, schedule_id, completed_at, started_at')
    .not('completed_at', 'is', null)
    .order('completed_at', { ascending: true }) // chronological order for line charts

  if (runErr) throw runErr

  if (!runs || runs.length === 0) {
    return []
  }

  // 2. Fetch all schedules to map standards
  const scheduleIds = runs.map(r => r.schedule_id).filter(Boolean)
  const { data: schedules, error: schedErr } = await supabase
    .from('audit_schedules')
    .select('id, title, standard_id')
    .in('id', scheduleIds)

  if (schedErr) throw schedErr

  // 3. Fetch active standards
  const { data: standards, error: stdErr } = await supabase
    .from('iso_standards')
    .select('id, name, version')

  if (stdErr) throw stdErr

  // 4. Fetch all results for these runs
  const runIds = runs.map(r => r.id)
  const { data: results, error: resErr } = await supabase
    .from('audit_results')
    .select('run_id, clause_id, status')
    .in('run_id', runIds)

  if (resErr) throw resErr

  // 5. Build trends list
  const trends = []

  for (const run of runs) {
    const sched = (schedules || []).find(s => s.id === run.schedule_id)
    if (!sched) continue

    const standard = (standards || []).find(s => s.id === sched.standard_id)
    if (!standard) continue

    // Resolve clauses for this standard
    const { data: groups } = await supabase
      .from('iso_clause_groups')
      .select('id')
      .eq('standard_id', standard.id)

    const groupIds = (groups || []).map(g => g.id)

    let clauses = []
    if (groupIds.length > 0) {
      const { data: clausesData } = await supabase
        .from('iso_clauses')
        .select('id')
        .in('group_id', groupIds)
        .eq('is_active', true)

      clauses = clausesData || []
    }

    const runResults = (results || []).filter(r => r.run_id === run.id)
    const score = calculateComplianceScore(runResults, clauses)

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
