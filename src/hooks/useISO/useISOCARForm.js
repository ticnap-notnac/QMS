import { useState, useCallback } from 'react'
import * as isoService from '@/services/isoService'
import { suggestClausesForCar, submitCarReport } from '@/services/carService'
import { CAR_STATUS } from '../../../shared/constants'
import { useLookup } from '@/context/LookupContext'

export function useISOCARForm({ userName, userAuthId, setToast, setCreatedCars, fetchComplianceData }) {
  const [isCarModalOpen, setIsCarModalOpen] = useState(false)
  const { userSiteId } = useLookup()
  
  const initialFormState = {
    requesting_department: '',
    responsible_department: '',
    requestor: userName || '',
    recipient: '',
    date: new Date().toISOString().split('T')[0],
    reason_reissue: '',
    no_reply: false,
    re_corrective_action: false,
    quality_food_safety: false,
    environment_health_safety: false,
    security_issue: false,
    internal_audit: true,
    customer_complaint: false,
    government_agency_audit: false,
    customer_audit_nonconformance: false,
    vendor_nonconformance: false,
    others: '',
    product_material_name: '',
    model_type: '',
    control_no: '',
    affected_quantity: '',
    details_of_nonconformance: '',
    request_date: new Date().toISOString().split('T')[0],
    linked_clause_ids: [],    // confirmed clause IDs to be saved
    suggested_clauses: [],    // suggestions returned by CBR/keyword
  }

  const [carForm, setCarForm] = useState(initialFormState)
  const [isSubmittingCar, setIsSubmittingCar] = useState(false)
  const [carError, setCarError] = useState('')
  const [activeFinding, setActiveFinding] = useState(null)

  const [departments, setDepartments] = useState([])
  const [users, setUsers] = useState([])
  const [allReports, setAllReports] = useState([])
  const [loadingDropdowns, setLoadingDropdowns] = useState(false)

  // Clause Suggestion specific states
  const [clausesLoading, setClausesLoading] = useState(false)
  const [clausesError, setClausesError] = useState(null)

  const loadDropdownOptions = useCallback(async () => {
    try {
      setLoadingDropdowns(true)
      const deptData = await isoService.fetchDepartments()
      const userData = await isoService.fetchUsers()
      
      setDepartments((deptData || []).map(d => ({ id: d.id, label: d.department_name })))
      const activeUserData = (userData || []).filter(u => String(u.status || 'ACTIVE').toUpperCase() === 'ACTIVE')
      setUsers(activeUserData.map(u => ({ 
        id: u.id, 
        label: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.user_name || 'Unnamed' 
      })))
    } catch (err) {
      console.error('[useISOCARForm] Error loading dropdown options:', err)
    } finally {
      setLoadingDropdowns(false)
    }
  }, [])

  const handleCarChange = (key, value) => {
    setCarForm(prev => ({ ...prev, [key]: value }))
    if (carError) setCarError('')
  }

  const toggleClauseSelection = (clauseId) => {
    setCarForm(prev => {
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
    if (!carForm.details_of_nonconformance?.trim()) {
      setClausesError('Please fill in the Details of Non-Conformance first.')
      return
    }

    setClausesLoading(true)
    setClausesError(null)

    const flags = {
      quality_food_safety: carForm.quality_food_safety,
      environment_health_safety: carForm.environment_health_safety,
      security_issue: carForm.security_issue,
      internal_audit: carForm.internal_audit,
      customer_complaint: carForm.customer_complaint,
      government_agency_audit: carForm.government_agency_audit,
      customer_audit_nonconformance: carForm.customer_audit_nonconformance,
      vendor_nonconformance: carForm.vendor_nonconformance,
    }

    try {
      const result = await suggestClausesForCar(
        { description: carForm.details_of_nonconformance, flags },
        userAuthId
      )
      const suggestions = result?.suggestions || []
      setCarForm(prev => ({ ...prev, suggested_clauses: suggestions }))

      if (suggestions.length === 0) {
        setClausesError('No matching clauses found. Try adding more detail to the description.')
      }
    } catch (err) {
      setClausesError('We could not fetch clause suggestions. Please try again later.')
    } finally {
      setClausesLoading(false)
    }
  }

  const handleOpenCarModal = (finding) => {
    setActiveFinding(finding)

    const schedule = finding.audit_runs?.audit_schedules || null
    const standard = schedule?.iso_standards || null
    const clauseNum = finding.iso_clauses?.clause_number || 'N/A'
    const clauseTitle = finding.iso_clauses?.title || ''
    const statusLabels = {
      major_nc: 'Major Non-Conformance (Major NC)',
      minor_nc: 'Minor Non-Conformance (Minor NC)',
      ofi: 'Opportunity for Improvement (OFI)'
    }
    const severityLabel = statusLabels[finding.status] || finding.status || 'Non-Conformance'

    const detailLines = [
      schedule?.title
        ? `Audit: ${schedule.title}${schedule.scheduled_date ? ` (${schedule.scheduled_date})` : ''}${standard?.name ? ` — ${standard.name}${standard.version ? ` (${standard.version})` : ''}` : ''}`
        : null,
      `Finding Severity: ${severityLabel}`,
      `Clause: ${clauseNum}${clauseTitle ? ` – ${clauseTitle}` : ''}`,
      finding.requirement ? `Requirement: ${finding.requirement}` : null,
      finding.notes ? `Findings / Notes: ${finding.notes}` : null,
      `Evidence: ${finding.evidence || 'None provided.'}`
    ].filter(Boolean)

    let details = detailLines.join('\n')

    if (finding.isNcrGap) {
      details = `Escalated Trend: Deficiency in Clause ${clauseNum} (${clauseTitle}). Details: ${finding.evidence}`
    }

    const prelinkedClauses = finding.clause_id
      ? [{
          clause_id: finding.clause_id,
          clause_number: clauseNum,
          title: clauseTitle || 'ISO Clause',
          confidence: 1
        }]
      : []

    setCarForm({
      ...initialFormState,
      date: schedule?.scheduled_date || initialFormState.date,
      request_date: schedule?.scheduled_date || initialFormState.request_date,
      internal_audit: true,
      requestor: userName || '',
      details_of_nonconformance: details,
      linked_clause_ids: finding.clause_id ? [finding.clause_id] : [],
      suggested_clauses: prelinkedClauses
    })
    setCarError('')
    setClausesError(null)
    setIsCarModalOpen(true)
  }

  const handleSubmitCAR = async (e) => {
    if (e) e.preventDefault()
    setIsSubmittingCar(true)
    setCarError('')
    try {
      const auditScheduleId = activeFinding?.audit_runs?.schedule_id || null

      // Link CAR to selected clauses + original triggering clause
      const allClauseIds = new Set(carForm.linked_clause_ids || [])
      if (activeFinding?.clause_id) {
        allClauseIds.add(activeFinding.clause_id)
      }

      const payload = {
        requesting_department: carForm.requesting_department,
        responsible_department: carForm.responsible_department,
        requestor: carForm.requestor,
        recipient: carForm.recipient,
        date: carForm.date || null,
        reason_reissue: carForm.reason_reissue || null,
        no_reply: carForm.no_reply,
        re_corrective_action: carForm.re_corrective_action,
        quality_food_safety: carForm.quality_food_safety,
        environment_health_safety: carForm.environment_health_safety,
        security_issue: carForm.security_issue,
        internal_audit: carForm.internal_audit,
        customer_complaint: carForm.customer_complaint,
        government_agency_audit: carForm.government_agency_audit,
        customer_audit_nonconformance: carForm.customer_audit_nonconformance,
        vendor_nonconformance: carForm.vendor_nonconformance,
        others: carForm.others || null,
        product_material_name: carForm.product_material_name || null,
        model_type: carForm.model_type || null,
        control_no: carForm.control_no || null,
        affected_quantity: carForm.affected_quantity ? parseInt(carForm.affected_quantity, 10) : null,
        details_of_nonconformance: carForm.details_of_nonconformance,
        request_date: carForm.request_date || null,
        audit_schedule_id: auditScheduleId,
        audit_result_id: activeFinding?.id || null,
        clause_ids: Array.from(allClauseIds),
        status: CAR_STATUS.OPEN,
        site_id: userSiteId
      }

      const insData = await submitCarReport(payload, userAuthId)
      const nextRef = insData?.reference_no || 'Created'

      setToast({
        message: `CAR ${nextRef} created successfully!`,
        type: 'success'
      })

      setCreatedCars(prev => ({ ...prev, [activeFinding.id]: nextRef }))
      setIsCarModalOpen(false)
      await fetchComplianceData()
    } catch (err) {
      console.error('[useISOCARForm] Error generating CAR:', err)
      setCarError('The CAR could not be generated. Please try again.')
    } finally {
      setIsSubmittingCar(false)
    }
  }

  return {
    carForm,
    isCarModalOpen,
    setIsCarModalOpen,
    isSubmittingCar,
    carError,
    activeFinding,
    departments,
    users,
    allReports,
    loadingDropdowns,
    clausesLoading,
    clausesError,
    loadDropdownOptions,
    handleCarChange,
    toggleClauseSelection,
    fetchClauseSuggestions,
    handleOpenCarModal,
    handleSubmitCAR
  }
}
