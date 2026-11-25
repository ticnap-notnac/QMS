import NodeCache from 'node-cache'
import { supabase } from '../lib/supabase.js'
import { fetchUserRoleAndPermissions } from '../middlewares/roleMiddleware.js'

const complianceCache = new NodeCache({ stdTTL: 30, checkperiod: 60, useClones: false })
const inFlightComplianceSnapshots = new Map()

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
  const { profile, roleName } = await fetchUserRoleAndPermissions(userAuthId)
  if (!profile) return null
  if (isAdminRole(roleName)) return null
  return profile.site_id || null
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
 * Shared, deduplicated, and cached compliance dataset loader.
 * Prevents duplicate queries when /compliance and /compliance/trends are requested simultaneously.
 */
async function getComplianceSnapshot(userAuthId = null) {
  const callerSiteId = await resolveCallerSiteId(userAuthId)
  const cacheKey = `compliance_snapshot:${callerSiteId ?? 'all'}`

  const cached = complianceCache.get(cacheKey)
  if (cached) return cached

  if (inFlightComplianceSnapshots.has(cacheKey)) {
    return inFlightComplianceSnapshots.get(cacheKey)
  }

  const promise = (async () => {
    try {
      let schedQuery = supabase.from('audit_schedules').select('id, title, standard_id, site_id')
      if (callerSiteId) {
        schedQuery = schedQuery.or(`site_id.is.null,site_id.eq.${callerSiteId}`)
      }

      const [stdRes, grpRes, clsRes, schedRes, runRes] = await Promise.all([
        supabase.from('iso_standards').select('id, name, version, is_active'),
        supabase.from('iso_clause_groups').select('id, standard_id'),
        supabase.from('iso_clauses').select('id, group_id').eq('is_active', true),
        schedQuery,
        supabase
          .from('audit_runs')
          .select('id, schedule_id, completed_at, started_at')
          .not('completed_at', 'is', null)
          .order('completed_at', { ascending: false })
      ])

      const allStandards = stdRes.data || []
      const activeStandards = allStandards.filter(s => s.is_active !== false)
      const schedulesList = schedRes.data || []
      const runsDesc = runRes.data || []

      const groupToStandard = new Map((grpRes.data || []).map(g => [g.id, g.standard_id]))
      const clausesByStandard = new Map()
      ;(clsRes.data || []).forEach(c => {
        const stdId = groupToStandard.get(c.group_id)
        if (stdId) {
          if (!clausesByStandard.has(stdId)) clausesByStandard.set(stdId, new Set())
          clausesByStandard.get(stdId).add(c.id)
        }
      })

      const scheduleToStandard = new Map(schedulesList.map(s => [s.id, s.standard_id]))
      const schedulesById = new Map(schedulesList.map(s => [s.id, s]))
      const standardsById = new Map(allStandards.map(s => [s.id, s]))

      const latestRunByStandard = new Map()
      runsDesc.forEach(r => {
        const stdId = scheduleToStandard.get(r.schedule_id)
        if (stdId && !latestRunByStandard.has(stdId)) {
          latestRunByStandard.set(stdId, r)
        }
      })

      // Only fetch audit_results for runs belonging to visible schedules
      const relevantRunsDesc = runsDesc.filter(r => schedulesById.has(r.schedule_id))
      const runIds = relevantRunsDesc.map(r => r.id)
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

      const stats = activeStandards.map(standard => {
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

      // Chronological ascending order for trends
      const runsAsc = [...relevantRunsDesc].reverse()
      const trends = []
      for (const run of runsAsc) {
        const sched = schedulesById.get(run.schedule_id)
        if (!sched) continue

        const standard = standardsById.get(sched.standard_id)
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

      const snapshot = { stats, trends }
      complianceCache.set(cacheKey, snapshot)
      return snapshot
    } finally {
      inFlightComplianceSnapshots.delete(cacheKey)
    }
  })()

  inFlightComplianceSnapshots.set(cacheKey, promise)
  return promise
}

/**
 * Fetches the latest compliance score for all active ISO standards.
 */
export async function fetchComplianceStats(userAuthId = null) {
  const { stats } = await getComplianceSnapshot(userAuthId)
  return stats
}

/**
 * Fetches historical completed audit runs and their compliance percentages.
 */
export async function fetchComplianceTrends(userAuthId = null) {
  const { trends } = await getComplianceSnapshot(userAuthId)
  return trends
}
