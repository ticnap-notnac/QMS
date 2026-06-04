import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabase'
import { fetchAllReports } from '../services/ncrService'
import { submitCapaPlan, verifyCarPlan } from '../services/carService'


const RECENTLY_VIEWED_KEY = 'dcc_recently_viewed'
const RECENTLY_VIEWED_LIMIT = 10

// ---------------------------------------------------------------------------
// helpers
// ---------------------------------------------------------------------------

function loadPersistedRecentlyViewed() {
  try {
    const raw = localStorage.getItem(RECENTLY_VIEWED_KEY)
    return raw ? JSON.parse(raw) : []
  } catch {
    return []
  }
}

function persistRecentlyViewed(list) {
  try {
    localStorage.setItem(RECENTLY_VIEWED_KEY, JSON.stringify(list))
  } catch {
    // storage unavailable – silent fail
  }
}

/**
 * Numeric-aware sort for clause_number strings (e.g. '4.10' > '4.2').
 * Returns a new sorted array; does not mutate the input.
 */
function sortClausesNumerically(clauses) {
  const parseParts = (s) =>
    s
      ? s.split('.').map((p) => {
        const n = parseInt(p, 10)
        return Number.isNaN(n) ? 0 : n
      })
      : [0]

  return [...clauses].sort((a, b) => {
    const pa = parseParts(a?.clause_number)
    const pb = parseParts(b?.clause_number)
    for (let i = 0; i < Math.max(pa.length, pb.length); i++) {
      const diff = (pa[i] ?? 0) - (pb[i] ?? 0)
      if (diff !== 0) return diff
    }
    return (a?.clause_number ?? '').localeCompare(b?.clause_number ?? '', undefined, {
      numeric: true,
    })
  })
}

// ---------------------------------------------------------------------------
// hook
// ---------------------------------------------------------------------------

export function useDCCLogic() {
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedFolder, setSelectedFolder] = useState(null)
  const [recentlyViewed, setRecentlyViewed] = useState(loadPersistedRecentlyViewed)

  // ISO standards list
  const [standards, setStandards] = useState([])
  const [loadingStandards, setLoadingStandards] = useState(false)

  // Selected standard + its clauses
  const [selectedStandard, setSelectedStandard] = useState(null)
  const [clauses, setClauses] = useState([])
  const [loadingClauses, setLoadingClauses] = useState(false)

  // Task Reports sub-folder navigation
  const [selectedTaskFolder, setSelectedTaskFolder] = useState(null)

  // NCR closed reports
  const [ncrReports, setNcrReports] = useState([])
  const [loadingNcr, setLoadingNcr] = useState(false)

  // CAR closed reports
  const [carReports, setCarReports] = useState([])
  const [loadingCar, setLoadingCar] = useState(false)

  // QDDR reports
  const [qddrReports, setQddrReports] = useState([])
  const [loadingQddr, setLoadingQddr] = useState(false)

  // Audit reports
  const [auditReports, setAuditReports] = useState([])
  const [loadingAudit, setLoadingAudit] = useState(false)

  // Audit schedules
  const [auditSchedules, setAuditSchedules] = useState([])
  const [loadingAuditSchedules, setLoadingAuditSchedules] = useState(false)

  // CAR details modal states
  const [selectedCar, setSelectedCar] = useState(null)
  const [isCarDetailsModalOpen, setIsCarDetailsModalOpen] = useState(false)


  // Load ISO standards whenever the iso_modules folder is opened
  useEffect(() => {
    if (selectedFolder?.id === 'iso_modules') {
      loadActiveStandards()
    }
  }, [selectedFolder])

  // NOTE: NCR loading is triggered imperatively from openTaskFolder()
  // to avoid a stale-closure bug (selectedFolder not in the dep array).

  // ------------------------------------------------------------------
  // recently-viewed
  // ------------------------------------------------------------------

  function addRecentlyViewed(item) {
    const entry = {
      id: item.id,
      label: item.label,
      path: item.path ?? null,
      when: new Date().toISOString(),
    }
    setRecentlyViewed((prev) => {
      const next = [entry, ...prev.filter((p) => p.id !== entry.id)].slice(
        0,
        RECENTLY_VIEWED_LIMIT,
      )
      persistRecentlyViewed(next)
      return next
    })
  }

  // folder navigation------------------------------------------------------------------

  function openFolder(item) {
    setSelectedFolder(item)
    setSelectedStandard(null)
    setClauses([])
    setSelectedTaskFolder(null)
    setNcrReports([])
    setCarReports([])
    setQddrReports([])
    setAuditReports([])
    setAuditSchedules([])
    addRecentlyViewed(item)
  }

  function closeFolder() {
    setSelectedFolder(null)
    setSelectedStandard(null)
    setClauses([])
    setSelectedTaskFolder(null)
    setNcrReports([])
    setCarReports([])
    setQddrReports([])
    setAuditReports([])
    setAuditSchedules([])
  }

  // Task Reports sub-folder navigation------------------------------------------------------------------

  function openTaskFolder(item) {
    setSelectedTaskFolder(item)
    setNcrReports([])
    setCarReports([])
    setQddrReports([])
    setAuditReports([])
    setAuditSchedules([])
    if (item.id === 'ncr') {
      loadClosedNCRs()
    } else if (item.id === 'car') {
      loadClosedCARs()
    } else if (item.id === 'qddr') {
      loadClosedQDDRs()
    } else if (item.id === 'audit') {
      loadClosedAudits()
    } else if (item.id === 'audit_schedules') {
      loadAuditSchedules()
    }
  }

  function closeTaskFolder() {
    setSelectedTaskFolder(null)
    setNcrReports([])
    setCarReports([])
    setQddrReports([])
    setAuditReports([])
    setAuditSchedules([])
  }


  // ISO standards  (iso_standards -> iso_clause_groups -> iso_clauses)------------------------------------------------------------------

  async function loadActiveStandards() {
    setLoadingStandards(true)
    try {
      const { data: standardsData, error: stdError } = await supabase
        .from('iso_standards')
        .select('id, name, version')
        .eq('is_active', true)
        .order('name')

      if (stdError) throw stdError

      // Enrich each standard with a denormalised clause count via the
      // 3-table join: iso_standards -> iso_clause_groups -> iso_clauses
      const enriched = await Promise.all(
        (standardsData ?? []).map(async (standard) => {
          const { data: groups } = await supabase
            .from('iso_clause_groups')
            .select('id')
            .eq('standard_id', standard.id)

          const groupIds = (groups ?? []).map((g) => g.id)

          let clauseCount = 0
          if (groupIds.length) {
            const { count } = await supabase
              .from('iso_clauses')
              .select('id', { count: 'exact', head: true })
              .in('group_id', groupIds)

            clauseCount = count ?? 0
          }

          return { ...standard, clauseCount }
        }),
      )

      setStandards(enriched)
    } catch (err) {
      console.error('[useDCCLogic] loadActiveStandards:', err?.message ?? err)
      setStandards([])
    } finally {
      setLoadingStandards(false)
    }
  }

  // ------------------------------------------------------------------
  // clauses for a selected standard
  // ------------------------------------------------------------------

  async function loadClausesForStandard(standardId) {
    setLoadingClauses(true)
    try {
      // Step 1 – resolve group IDs for this standard
      const { data: groups, error: groupsError } = await supabase
        .from('iso_clause_groups')
        .select('id')
        .eq('standard_id', standardId)

      if (groupsError) throw groupsError

      const groupIds = (groups ?? []).map((g) => g.id)

      if (!groupIds.length) {
        setClauses([])
        return
      }

      // Step 2 – fetch all clauses in those groups (no is_active filter per
      // original intent; inactive rows are displayed with an Inactive pill)
      const { data: clausesData, error: clausesError } = await supabase
        .from('iso_clauses')
        .select('id, clause_number, title, description, is_active, group_id')
        .in('group_id', groupIds)

      if (clausesError) throw clausesError

      setClauses(sortClausesNumerically(clausesData ?? []))
    } catch (err) {
      console.error('[useDCCLogic] loadClausesForStandard:', err?.message ?? err)
      setClauses([])
    } finally {
      setLoadingClauses(false)
    }
  }

  async function openStandard(standard) {
    setSelectedStandard(standard)
    await loadClausesForStandard(standard.id)
  }

  function closeStandard() {
    setSelectedStandard(null)
    setClauses([])
  }

  // ------------------------------------------------------------------
  // NCR closed reports  (ncr_reports table, status = 'CLOSED')
  // ------------------------------------------------------------------

  async function loadClosedNCRs() {
    setLoadingNcr(true)
    try {
      const data = await fetchAllReports()
      const closedReports = (data || []).filter((r) => r.status === 'CLOSED')
      console.debug('[useDCCLogic] loadClosedNCRs → rows returned:', closedReports.length)
      setNcrReports(closedReports)
    } catch (err) {
      console.error('[useDCCLogic] loadClosedNCRs error:', err?.message ?? err, err)
      setNcrReports([])
    } finally {
      setLoadingNcr(false)
    }
  }

  // ------------------------------------------------------------------
  // CAR closed reports  (car_reports table, status = 'closed')
  // ------------------------------------------------------------------

  async function loadClosedCARs() {
    setLoadingCar(true)
    try {
      const { data, error } = await supabase
        .from('car_reports')
        .select('*, audit_schedules(id, title, scheduled_date)')
        .order('created_at', { ascending: false })

      if (error) throw error
      console.debug('[useDCCLogic] loadClosedCARs → rows returned:', data?.length || 0)
      setCarReports(data || [])
    } catch (err) {
      console.error('[useDCCLogic] loadClosedCARs error:', err?.message ?? err)
      setCarReports([])
    } finally {
      setLoadingCar(false)
    }
  }

  // ------------------------------------------------------------------
  // QDDR closed reports (qddr_reports table)
  // ------------------------------------------------------------------

  async function loadClosedQDDRs() {
    setLoadingQddr(true)
    try {
      const { data, error } = await supabase
        .from('qddr_reports')
        .select('*')
        .order('created_at', { ascending: false })

      if (error) throw error
      console.debug('[useDCCLogic] loadClosedQDDRs → rows returned:', data?.length || 0)
      setQddrReports(data || [])
    } catch (err) {
      console.error('[useDCCLogic] loadClosedQDDRs error:', err?.message ?? err)
      setQddrReports([])
    } finally {
      setLoadingQddr(false)
    }
  }

  // ------------------------------------------------------------------
  // Completed Audit Runs (audit_runs table)
  // ------------------------------------------------------------------

  async function loadClosedAudits() {
    setLoadingAudit(true)
    try {
      const { data: runs, error: runError } = await supabase
        .from('audit_runs')
        .select('*')
        .not('completed_at', 'is', null)
        .order('completed_at', { ascending: false })

      if (runError) throw runError

      if (!runs || runs.length === 0) {
        setAuditReports([])
        return
      }

      const scheduleIds = runs.map(r => r.schedule_id).filter(Boolean)
      const { data: schedulesData, error: schedError } = await supabase
        .from('audit_schedules')
        .select('id, title, standard_id, scheduled_date')
        .in('id', scheduleIds)

      if (schedError) throw schedError

      const { data: standardsData, error: stdError } = await supabase
        .from('iso_standards')
        .select('id, name, version')

      if (stdError) throw stdError

      const { data: auditorsData, error: audError } = await supabase
        .from('users')
        .select('id, first_name, last_name, auth_id')

      if (audError) throw audError

      const mapped = runs.map(run => {
        const sched = (schedulesData || []).find(s => s.id === run.schedule_id)
        const std = sched ? (standardsData || []).find(s => s.id === sched.standard_id) : null
        const aud = (auditorsData || []).find(a => a.auth_id === run.auditor_id)

        return {
          id: run.id,
          title: sched?.title || 'Unnamed Audit',
          standard_name: std ? `${std.name} (${std.version})` : 'Unknown Standard',
          auditor_name: aud ? `${aud.first_name} ${aud.last_name}` : 'Unknown Auditor',
          started_at: run.started_at,
          completed_at: run.completed_at
        }
      })

      setAuditReports(mapped)
    } catch (err) {
      console.error('[useDCCLogic] loadClosedAudits error:', err?.message ?? err)
      setAuditReports([])
    } finally {
      setLoadingAudit(false)
    }
  }

  async function loadAuditSchedules() {
    setLoadingAuditSchedules(true)
    try {
      const { data: schedulesData, error: schedError } = await supabase
        .from('audit_schedules')
        .select('id, title, scheduled_date, status, standard_id, auditor_id')
        .order('scheduled_date', { ascending: false })

      if (schedError) throw schedError

      const { data: standardsData, error: stdError } = await supabase
        .from('iso_standards')
        .select('id, name, version')

      if (stdError) throw stdError

      const { data: auditorsData, error: audError } = await supabase
        .from('users')
        .select('id, first_name, last_name, auth_id')

      if (audError) throw audError

      const mapped = (schedulesData || []).map(schedule => {
        const std = (standardsData || []).find(s => s.id === schedule.standard_id)
        const aud = (auditorsData || []).find(a => a.auth_id === schedule.auditor_id)
        return {
          ...schedule,
          standard_name: std ? `${std.name} (${std.version})` : 'Unknown Standard',
          auditor_name: aud ? `${aud.first_name} ${aud.last_name}` : 'Unknown Auditor'
        }
      })

      setAuditSchedules(mapped)
    } catch (err) {
      console.error('[useDCCLogic] loadAuditSchedules error:', err?.message ?? err)
      setAuditSchedules([])
    } finally {
      setLoadingAuditSchedules(false)
    }
  }

  // CAR details actions
  const handleOpenCarDetails = (car) => {
    setSelectedCar(car)
    setIsCarDetailsModalOpen(true)
  }

  const handleCloseCarDetails = () => {
    setSelectedCar(null)
    setIsCarDetailsModalOpen(false)
  }

  const handleCapaSubmit = async (carId, data, userAuthId) => {
    try {
      const res = await submitCapaPlan(carId, data, userAuthId)
      await loadClosedCARs()
      setSelectedCar(res)
      return res
    } catch (err) {
      console.error('[useDCCLogic] handleCapaSubmit error:', err)
      throw err
    }
  }

  const handleCarVerify = async (carId, data, userAuthId) => {
    try {
      const res = await verifyCarPlan(carId, data, userAuthId)
      await loadClosedCARs()
      setSelectedCar(res)
      return res
    } catch (err) {
      console.error('[useDCCLogic] handleCarVerify error:', err)
      throw err
    }
  }

  // public API------------------------------------------------------------------

  return {
    // search
    searchQuery,
    setSearchQuery,

    // folder nav
    selectedFolder,
    openFolder,
    closeFolder,

    // recently viewed
    recentlyViewed,

    // ISO standards
    standards,
    loadingStandards,

    // ISO clauses
    selectedStandard,
    clauses,
    loadingClauses,
    openStandard,
    closeStandard,

    // Task Reports sub-folder nav
    selectedTaskFolder,
    openTaskFolder,
    closeTaskFolder,

    // NCR closed reports
    ncrReports,
    loadingNcr,

    // CAR closed reports
    carReports,
    loadingCar,

    // QDDR closed reports
    qddrReports,
    loadingQddr,

    // Audit reports
    auditReports,
    loadingAudit,

    // Audit schedules
    auditSchedules,
    loadingAuditSchedules,

    // CAR details
    selectedCar,
    isCarDetailsModalOpen,
    openCarDetails: handleOpenCarDetails,
    closeCarDetails: handleCloseCarDetails,
    submitCapa: handleCapaSubmit,
    verifyCar: handleCarVerify,
  }
}
