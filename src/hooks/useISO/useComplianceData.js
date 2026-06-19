import { useState, useCallback } from 'react'
import * as isoService from '@/services/isoService'
import { supabase } from '@/utils/supabase'
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

      // Fetch CAR reports with clause links to filter out linked NCRs and populate createdCars
      const { data: carsList, error: carsError } = await supabase
        .from('car_reports')
        .select(`
          id,
          reference_no,
          audit_schedule_id,
          ncr_id,
          car_clause_links (
            clause_id
          )
        `)
      if (carsError) throw carsError

      const linkedNcrIds = new Set()
      ;(carsList || []).forEach(car => {
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

      const allFindings = [...findingsData, ...escalatedFindings]
      setNonCompliantFindings(allFindings)

      // Dynamically populate createdCars map
      const carsMap = {}
      if (carsList && carsList.length > 0) {
        allFindings.forEach(finding => {
          const matchingCar = carsList.find(car => {
            // Match unlinked escalations by checking if NCR ID matches
            if (finding.isNcrGap && !finding.clause_id) {
              const carNcrIds = Array.isArray(car.ncr_id) ? car.ncr_id.map(Number) : []
              return finding.ncr_ids.some(nid => carNcrIds.includes(Number(nid)))
            }
            
            // Match audit result gaps or trend gaps by clause_id via links
            const linkedClauseIds = (car.car_clause_links || []).map(l => l.clause_id)
            if (finding.clause_id && linkedClauseIds.includes(finding.clause_id)) {
              if (!finding.isNcrGap && finding.audit_runs?.schedule_id) {
                return String(car.audit_schedule_id || '').toLowerCase() === String(finding.audit_runs.schedule_id || '').toLowerCase()
              }
              return true
            }
            return false
          })

          if (matchingCar) {
            carsMap[finding.id] = matchingCar.reference_no
          }
        })
      }
      setCreatedCars(carsMap)
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
