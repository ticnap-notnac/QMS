import { useState, useCallback } from 'react'
import * as dccService from '@/services/dccService'
import { fetchAllReports } from '@/services/ncrService'
import { submitCapaPlan, verifyCarPlan } from '@/services/carService'
import { supabase } from '@/utils/supabase'

export function useDCCTaskReports({ carDetails } = {}) {
  const [ncrReports, setNcrReports] = useState([])
  const [loadingNcr, setLoadingNcr] = useState(false)

  const [carReports, setCarReports] = useState([])
  const [loadingCar, setLoadingCar] = useState(false)

  const [qddrReports, setQddrReports] = useState([])
  const [loadingQddr, setLoadingQddr] = useState(false)

  const [auditReports, setAuditReports] = useState([])
  const [loadingAudit, setLoadingAudit] = useState(false)

  const [auditSchedules, setAuditSchedules] = useState([])
  const [loadingAuditSchedules, setLoadingAuditSchedules] = useState(false)

  // Fallback state if carDetails is not passed (testing or isolation)
  const [localSelectedCar, setLocalSelectedCar] = useState(null)
  const [localIsCarDetailsModalOpen, setLocalIsCarDetailsModalOpen] = useState(false)

  const selectedCar = carDetails ? carDetails.selectedCar : localSelectedCar
  const isCarDetailsModalOpen = carDetails ? carDetails.isCarDetailsModalOpen : localIsCarDetailsModalOpen

  const openCarDetails = useCallback((car) => {
    if (carDetails) {
      carDetails.openCarDetails(car)
    } else {
      setLocalSelectedCar(car)
      setLocalIsCarDetailsModalOpen(true)
    }
  }, [carDetails])

  const closeCarDetails = useCallback(() => {
    if (carDetails) {
      carDetails.closeCarDetails()
    } else {
      setLocalSelectedCar(null)
      setLocalIsCarDetailsModalOpen(false)
    }
  }, [carDetails])

  const loadClosedNCRs = useCallback(async () => {
    setLoadingNcr(true)
    try {
      const data = await fetchAllReports()
      const closedReports = (data || []).filter((r) => r.status === 'CLOSED')
      setNcrReports(closedReports)
    } catch (err) {
      console.error('[useDCCTaskReports] loadClosedNCRs error:', err?.message ?? err)
      setNcrReports([])
    } finally {
      setLoadingNcr(false)
    }
  }, [])

  const loadClosedCARs = useCallback(async () => {
    setLoadingCar(true)
    try {
      const data = await dccService.fetchCarReports()
      setCarReports(data || [])
    } catch (err) {
      console.error('[useDCCTaskReports] loadClosedCARs error:', err?.message ?? err)
      setCarReports([])
    } finally {
      setLoadingCar(false)
    }
  }, [])

  const loadClosedQDDRs = useCallback(async () => {
    setLoadingQddr(true)
    try {
      const data = await dccService.fetchQddrReports()
      setQddrReports(data || [])
    } catch (err) {
      console.error('[useDCCTaskReports] loadClosedQDDRs error:', err?.message ?? err)
      setQddrReports([])
    } finally {
      setLoadingQddr(false)
    }
  }, [])

  const loadClosedAudits = useCallback(async () => {
    setLoadingAudit(true)
    try {
      const runs = await dccService.fetchAuditRuns()
      if (!runs || runs.length === 0) {
        setAuditReports([])
        return
      }

      const scheduleIds = runs.map(r => r.schedule_id).filter(Boolean)
      const schedulesData = await dccService.fetchAuditSchedules()
      const filteredSchedules = (schedulesData || []).filter(s => scheduleIds.includes(s.id))

      const standardsData = await dccService.fetchStandardsForAuditMapping()
      const auditorsData = await dccService.fetchAuditorsForAuditMapping()
      
      const runIds = runs.map(r => r.id)
      const { data: resultsData } = await supabase
        .from('audit_results')
        .select('run_id, status')
        .in('run_id', runIds)

      const mapped = runs.map(run => {
        const sched = filteredSchedules.find(s => s.id === run.schedule_id)
        const std = sched ? (standardsData || []).find(s => s.id === sched.standard_id) : null
        const aud = (auditorsData || []).find(a => a.auth_id === run.auditor_id)

        const runRes = (resultsData || []).filter(r => r.run_id === run.id)
        const totalClauses = runRes.length
        const compliantClauses = runRes.filter(r => r.status === 'compliant').length
        const partialClauses = runRes.filter(r => r.status === 'partial').length
        const nonCompliantClauses = runRes.filter(r => r.status === 'non_compliant').length
        const naClauses = runRes.filter(r => r.status === 'na').length

        const applicableCount = totalClauses - naClauses
        const score = applicableCount > 0 
          ? Math.round((compliantClauses / applicableCount) * 100) 
          : 100

        return {
          id: run.id,
          schedule_id: run.schedule_id,
          title: sched?.title || 'Unnamed Audit',
          standard_name: std ? `${std.name} (${std.version})` : 'Unknown Standard',
          auditor_name: aud ? `${aud.first_name} ${aud.last_name}` : 'Unknown Auditor',
          started_at: run.started_at,
          completed_at: run.completed_at,
          score,
          totalClauses,
          compliantClauses,
          partialClauses,
          nonCompliantClauses,
          naClauses
        }
      })

      setAuditReports(mapped)
    } catch (err) {
      console.error('[useDCCTaskReports] loadClosedAudits error:', err?.message ?? err)
      setAuditReports([])
    } finally {
      setLoadingAudit(false)
    }
  }, [])

  const loadAuditSchedules = useCallback(async () => {
    setLoadingAuditSchedules(true)
    try {
      const schedulesData = await dccService.fetchAuditSchedules()
      const standardsData = await dccService.fetchStandardsForAuditMapping()
      const auditorsData = await dccService.fetchAuditorsForAuditMapping()

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
      console.error('[useDCCTaskReports] loadAuditSchedules error:', err?.message ?? err)
      setAuditSchedules([])
    } finally {
      setLoadingAuditSchedules(false)
    }
  }, [])

  const handleCapaSubmit = useCallback(async (carId, data, userAuthId) => {
    try {
      const res = await submitCapaPlan(carId, data, userAuthId)
      await loadClosedCARs()
      if (carDetails) {
        carDetails.setSelectedCar(res)
      } else {
        setLocalSelectedCar(res)
      }
      return res
    } catch (err) {
      console.error('[useDCCTaskReports] handleCapaSubmit error:', err)
      throw err
    }
  }, [carDetails, loadClosedCARs])

  const handleCarVerify = useCallback(async (carId, data, userAuthId) => {
    try {
      const res = await verifyCarPlan(carId, data, userAuthId)
      await loadClosedCARs()
      if (carDetails) {
        carDetails.setSelectedCar(res)
      } else {
        setLocalSelectedCar(res)
      }
      return res
    } catch (err) {
      console.error('[useDCCTaskReports] handleCarVerify error:', err)
      throw err
    }
  }, [carDetails, loadClosedCARs])

  const clearAllReports = useCallback(() => {
    setNcrReports([])
    setCarReports([])
    setQddrReports([])
    setAuditReports([])
    setAuditSchedules([])
  }, [])

  return {
    ncrReports,
    loadingNcr,
    carReports,
    loadingCar,
    qddrReports,
    loadingQddr,
    auditReports,
    loadingAudit,
    auditSchedules,
    loadingAuditSchedules,
    selectedCar,
    isCarDetailsModalOpen,
    openCarDetails,
    closeCarDetails,
    submitCapa: handleCapaSubmit,
    verifyCar: handleCarVerify,
    loadClosedNCRs,
    loadClosedCARs,
    loadClosedQDDRs,
    loadClosedAudits,
    loadAuditSchedules,
    clearAllReports
  }
}
