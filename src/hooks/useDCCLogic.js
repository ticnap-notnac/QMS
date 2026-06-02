import { useState, useEffect } from 'react'
import { supabase } from '../utils/supabase'
import { fetchAllReports } from '../services/ncrService'

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
    addRecentlyViewed(item)
  }

  function closeFolder() {
    setSelectedFolder(null)
    setSelectedStandard(null)
    setClauses([])
    setSelectedTaskFolder(null)
    setNcrReports([])
    setCarReports([])
  }

  // Task Reports sub-folder navigation------------------------------------------------------------------

  function openTaskFolder(item) {
    setSelectedTaskFolder(item)
    setNcrReports([])
    setCarReports([])
    if (item.id === 'ncr') {
      loadClosedNCRs()
    } else if (item.id === 'car') {
      loadClosedCARs()
    }
  }

  function closeTaskFolder() {
    setSelectedTaskFolder(null)
    setNcrReports([])
    setCarReports([])
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
        .select('*')
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
  }
}