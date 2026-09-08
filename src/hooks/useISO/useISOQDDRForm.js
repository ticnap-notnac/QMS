import { useState, useCallback } from 'react'
import * as isoService from '@/services/isoService'
import * as ncrService from '@/services/ncrService'
import { loadLocations } from '@/services/locationService'
import { submitQddrReport } from '@/services/qddrService'
import { suggestClausesForCar } from '@/services/carService'
import { useLookup } from '@/context/LookupContext'

export function useISOQDDRForm({ userName, userAuthId, setToast, setCreatedCars, fetchComplianceData }) {
  const [isQddrModalOpen, setIsQddrModalOpen] = useState(false)
  const { userSiteId } = useLookup()
  
  const initialFormState = {
    location: '',
    date: new Date().toISOString().split('T')[0],
    time: '',
    trucker_broker: '',
    plate_number: '',
    container_number: '',
    po_reference: '',
    drwb_number: '',
    brand_supplier: '',
    material_description: '',
    material_code: '',
    batch_code_su_number: '',
    holes_punctures: false,
    deformed_torn: false,
    open_carton: false,
    crushed_dented: false,
    wet_leaked: false,
    stain_graffiti: false,
    bulging: false,
    improper_stretch_wrapping: false,
    wrong_no_batchcode: false,
    opened_seal: false,
    no_label_broken_label: false,
    short_pack: false,
    excess_shipment: false,
    documentation_error: false,
    picking_discrepancy: false,
    others: '',
    qty: '',
    reason_of_discrepancy: '',
    corrective_action: '',
    preventive_action: '',
    approved_by: '',
    noted_by: '',
    leader: '',
    ncr_id: null,
    linked_ncr_reference: '',
    linked_clause_ids: [],
    suggested_clauses: []
  }

  const [qddrForm, setQddrForm] = useState(initialFormState)
  const [isSubmittingQddr, setIsSubmittingQddr] = useState(false)
  const [qddrError, setQddrError] = useState('')
  const [activeFinding, setActiveFinding] = useState(null)

  const [locations, setLocations] = useState([])
  const [users, setUsers] = useState([])
  const [allReports, setAllReports] = useState([])
  const [loadingDropdowns, setLoadingDropdowns] = useState(false)

  // Clause Suggestion specific states
  const [clausesLoading, setClausesLoading] = useState(false)
  const [clausesError, setClausesError] = useState(null)
  const [suggesting, setSuggesting] = useState(false)
  const [suggestActions, setSuggestActions] = useState(null)

  const loadDropdownOptions = useCallback(async () => {
    try {
      setLoadingDropdowns(true)
      const locData = await loadLocations()
      const userData = await isoService.fetchUsers()
      
      try {
        const reportsData = await ncrService.fetchAllReports()
        setAllReports(reportsData || [])
      } catch (reportsErr) {
        console.error('[useISOQDDRForm] Error loading NCR reports:', reportsErr)
      }
      
      setLocations((locData || []).map(d => ({ id: d.id, label: d.location_name })))
      const activeUserData = (userData || []).filter(u => String(u.status || 'ACTIVE').toUpperCase() === 'ACTIVE')
      setUsers(activeUserData.map(u => ({ 
        id: u.id, 
        label: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.user_name || 'Unnamed' 
      })))
    } catch (err) {
      console.error('[useISOQDDRForm] Error loading dropdown options:', err)
    } finally {
      setLoadingDropdowns(false)
    }
  }, [])

  const handleQddrChange = (key, value) => {
    setQddrForm(prev => ({ ...prev, [key]: value }))
    if (qddrError) setQddrError('')
  }

  const selectNcr = async (id, reference, report = null) => {
    setQddrForm(prev => ({
      ...prev,
      ncr_id: prev.ncr_id === id ? null : id,
      linked_ncr_reference: prev.ncr_id === id ? '' : reference
    }))
  }

  const toggleClauseSelection = (clauseId) => {
    setQddrForm(prev => {
      const already = prev.linked_clause_ids.includes(clauseId)
      return {
        ...prev,
        linked_clause_ids: already
          ? prev.linked_clause_ids.filter(c => c !== clauseId)
          : [...prev.linked_clause_ids, clauseId]
      }
    })
  }

  const fetchClauseSuggestions = async (userAuthId) => {
    if (!qddrForm.reason_of_discrepancy?.trim()) {
      setClausesError('Please fill in the Reason of Discrepancy first.')
      return
    }

    setClausesLoading(true)
    setClausesError(null)

    try {
      const result = await suggestClausesForCar(
        { description: qddrForm.reason_of_discrepancy, flags: {} },
        userAuthId
      )
      const suggestions = result?.suggestions || []
      setQddrForm(prev => ({ ...prev, suggested_clauses: suggestions }))

      if (suggestions.length === 0) {
        setClausesError('No matching clauses found. Try adding more detail.')
      }
    } catch (err) {
      setClausesError('We could not fetch clause suggestions. Please try again later.')
    } finally {
      setClausesLoading(false)
    }
  }

  const handleOpenQddrModal = (finding) => {
    setActiveFinding(finding)

    let details = `Audit finding: Deficiency in Clause ${finding.iso_clauses?.clause_number || ''} (${finding.iso_clauses?.title || ''}). Evidence: ${finding.evidence || 'None provided.'}`
    let ncrId = null

    if (finding.isNcrGap) {
      details = `Escalated NCR Trend: Deficiency in Clause ${finding.iso_clauses?.clause_number || ''} (${finding.iso_clauses?.title || ''}). Active NCRs: ${finding.ncr_references.join(', ')}. Details: ${finding.evidence}`
      ncrId = finding.ncr_ids?.[0] || null
    }

    setQddrForm({
      ...initialFormState,
      leader: userName || '',
      reason_of_discrepancy: details,
      ncr_id: ncrId
    })
    setQddrError('')
    setClausesError(null)
    setIsQddrModalOpen(true)
  }

  const handleSubmitQDDR = async (e) => {
    if (e) e.preventDefault()
    setIsSubmittingQddr(true)
    setQddrError('')
    try {
      const auditScheduleId = activeFinding?.audit_runs?.schedule_id || null

      // Link QDDR to selected clauses + original triggering clause
      const allClauseIds = new Set(qddrForm.linked_clause_ids || [])
      if (activeFinding?.clause_id) {
        allClauseIds.add(activeFinding.clause_id)
      }

      const payload = {
        ...qddrForm,
        audit_schedule_id: auditScheduleId,
        clause_ids: Array.from(allClauseIds),
        site_id: userSiteId
      }

      const insData = await submitQddrReport(payload, userAuthId)
      const nextRef = insData?.reference_no || 'Created'

      setToast({
        message: `QDDR ${nextRef} created successfully!`,
        type: 'success'
      })

      setCreatedCars(prev => ({ ...prev, [activeFinding.id]: nextRef }))
      setIsQddrModalOpen(false)
      await fetchComplianceData()
    } catch (err) {
      console.error('[useISOQDDRForm] Error generating QDDR:', err)
      setQddrError('The QDDR could not be generated. Please try again.')
    } finally {
      setIsSubmittingQddr(false)
    }
  }

  return {
    qddrForm,
    isQddrModalOpen,
    setIsQddrModalOpen,
    isSubmittingQddr,
    qddrError,
    activeFinding,
    locations,
    users,
    allReports,
    loadingDropdowns,
    clausesLoading,
    clausesError,
    suggesting,
    suggestActions,
    loadDropdownOptions,
    handleQddrChange: handleQddrChange,
    selectNcr,
    toggleClauseSelection,
    fetchClauseSuggestions,
    handleOpenQddrModal,
    handleSubmitQDDR
  }
}
