import { useState, useCallback } from 'react'
import * as dccService from '@/services/dccService'

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

export function useDCCISO() {
  const [standards, setStandards] = useState([])
  const [loadingStandards, setLoadingStandards] = useState(false)
  const [selectedStandard, setSelectedStandard] = useState(null)
  const [clauses, setClauses] = useState([])
  const [loadingClauses, setLoadingClauses] = useState(false)

  const loadActiveStandards = useCallback(async () => {
    setLoadingStandards(true)
    try {
      const standardsData = await dccService.fetchActiveStandards()

      const enriched = await Promise.all(
        standardsData.map(async (standard) => {
          const groups = await dccService.fetchClauseGroupsForStandard(standard.id)
          const groupIds = (groups ?? []).map((g) => g.id)

          let clauseCount = 0
          if (groupIds.length) {
            clauseCount = await dccService.fetchClausesCount(groupIds)
          }

          return { ...standard, clauseCount }
        }),
      )

      setStandards(enriched)
    } catch (err) {
      console.error('[useDCCISO] loadActiveStandards:', err?.message ?? err)
      setStandards([])
    } finally {
      setLoadingStandards(false)
    }
  }, [])

  const loadClausesForStandard = useCallback(async (standardId) => {
    setLoadingClauses(true)
    try {
      const groups = await dccService.fetchClauseGroupsForStandard(standardId)
      const groupIds = (groups ?? []).map((g) => g.id)

      if (!groupIds.length) {
        setClauses([])
        return
      }

      const clausesData = await dccService.fetchClausesByGroupIds(groupIds)
      setClauses(sortClausesNumerically(clausesData ?? []))
    } catch (err) {
      console.error('[useDCCISO] loadClausesForStandard:', err?.message ?? err)
      setClauses([])
    } finally {
      setLoadingClauses(false)
    }
  }, [])

  const openStandard = useCallback(async (standard, resetSearchQueryCallback) => {
    setSelectedStandard(standard)
    if (resetSearchQueryCallback) resetSearchQueryCallback()
    await loadClausesForStandard(standard.id)
  }, [loadClausesForStandard])

  const closeStandard = useCallback((resetSearchQueryCallback) => {
    setSelectedStandard(null)
    setClauses([])
    if (resetSearchQueryCallback) resetSearchQueryCallback()
  }, [])

  return {
    standards,
    loadingStandards,
    selectedStandard,
    setSelectedStandard,
    clauses,
    loadingClauses,
    loadActiveStandards,
    loadClausesForStandard,
    openStandard,
    closeStandard,
    setClauses
  }
}
