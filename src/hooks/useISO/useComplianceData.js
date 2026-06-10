import { useState, useCallback } from 'react'
import * as isoService from '@/services/isoService'
import { SEVERITY_LEVELS, AUDIT_STATUS } from '../../../shared/constants'

export function useComplianceData() {
  const [compliantCount, setCompliantCount] = useState(0)
  const [partialCount, setPartialCount] = useState(0)
  const [gapCount, setGapCount] = useState(0)
  const [overallScore, setOverallScore] = useState(100)
  const [nonCompliantFindings, setNonCompliantFindings] = useState([])
  const [createdCars, setCreatedCars] = useState({})

  const fetchComplianceData = useCallback(async () => {
    try {
      const results = await isoService.fetchAuditResults()
      
      let comp = 0
      let part = 0
      let gp = 0

      results.forEach(row => {
        if (row.status === AUDIT_STATUS.COMPLIANT) comp++
        else if (row.status === AUDIT_STATUS.PARTIAL) part++
        else if (row.status === AUDIT_STATUS.NON_COMPLIANT) gp++
      })

      const total = comp + part + gp
      
      setCompliantCount(comp)
      setPartialCount(part)
      setGapCount(gp)

      if (total > 0) {
        setOverallScore(Math.round((comp / total) * 100))
      } else {
        setOverallScore(100)
      }

      // Fetch non-compliant findings
      const findingsData = await isoService.fetchNonCompliantFindings()

      // Fetch CAR reports to filter out linked NCRs
      const carData = await isoService.fetchLinkedCarNcrIds()
      const linkedNcrIds = new Set()
      carData.forEach(car => {
        if (Array.isArray(car.ncr_id)) {
          car.ncr_id.forEach(id => linkedNcrIds.add(Number(id)))
        }
      })

      // Fetch NCRs
      const rawNcrData = await isoService.fetchNcrReportsForISO()
      const ncrData = (rawNcrData || []).filter(ncr => !linkedNcrIds.has(Number(ncr.id)))

      // Group active NCRs by clause_id in memory
      const ncrGroups = {}
      const unlinkedEscalations = []

      ncrData.forEach(ncr => {
        const cid = ncr.clause_id
        if (cid) {
          if (!ncrGroups[cid]) {
            ncrGroups[cid] = {
              clause: ncr.iso_clauses,
              ncrs: []
            }
          }
          ncrGroups[cid].ncrs.push(ncr)
        } else {
          const sev = String(ncr.severity || '').trim().toLowerCase()
          if ([SEVERITY_LEVELS.HIGH, SEVERITY_LEVELS.CRITICAL].includes(sev)) {
            unlinkedEscalations.push({
              id: `ncr-unlinked-${ncr.id}`,
              isNcrGap: true,
              clause_id: null,
              iso_clauses: { clause_number: 'N/A', title: 'High Severity Issue (Unlinked)' },
              evidence: `Escalated Alert: High/Critical severity report [${ncr.reference_no}] has been submitted. Description: ${ncr.description}`,
              ncr_ids: [ncr.id],
              ncr_references: [ncr.reference_no]
            })
          }
        }
      })

      // Check thresholds: Low >= 3, Medium >= 2, High/Critical >= 1
      const escalatedFindings = [...unlinkedEscalations]
      Object.entries(ncrGroups).forEach(([clauseId, group]) => {
        const lowNcrs = group.ncrs.filter(n => String(n.severity || '').trim().toLowerCase() === SEVERITY_LEVELS.LOW)
        const medNcrs = group.ncrs.filter(n => String(n.severity || '').trim().toLowerCase() === SEVERITY_LEVELS.MEDIUM)
        const highNcrs = group.ncrs.filter(n => [SEVERITY_LEVELS.HIGH, SEVERITY_LEVELS.CRITICAL].includes(String(n.severity || '').trim().toLowerCase()))

        const lowCount = lowNcrs.length
        const medCount = medNcrs.length
        const highCount = highNcrs.length

        if (lowCount >= 3 || medCount >= 2 || highCount >= 1) {
          const details = []
          if (highCount > 0) details.push(`${highCount} High/Critical`)
          if (medCount > 0) details.push(`${medCount} Medium`)
          if (lowCount > 0) details.push(`${lowCount} Low`)

          const matchedNcrs = [...highNcrs, ...medNcrs, ...lowNcrs]

          escalatedFindings.push({
            id: `ncr-gap-${clauseId}`,
            isNcrGap: true,
            clause_id: clauseId,
            iso_clauses: group.clause,
            evidence: `Escalated NCR Trend: ${matchedNcrs.length} active NCRs (${details.join(', ')}) violating this clause. Affected: ${matchedNcrs.map(n => n.reference_no).join(', ')}`,
            ncr_ids: matchedNcrs.map(n => n.id),
            ncr_references: matchedNcrs.map(n => n.reference_no)
          })
        }
      })

      setNonCompliantFindings([...findingsData, ...escalatedFindings])
    } catch (err) {
      console.error('[useComplianceData] Error fetching compliance data:', err)
    }
  }, [])

  return {
    compliantCount,
    partialCount,
    gapCount,
    overallScore,
    nonCompliantFindings,
    createdCars,
    setCreatedCars,
    fetchComplianceData
  }
}
