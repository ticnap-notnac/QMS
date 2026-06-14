import { useState, useCallback } from 'react'
import * as isoService from '@/services/isoService'
import { suggestClausesForCar } from '@/services/carService'
import { CAR_STATUS } from '../../../shared/constants'
import { useLookup } from '@/context/LookupContext'

export function useISOCARForm({ userName, setToast, setCreatedCars, fetchComplianceData }) {
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
    ncr_ids: [],
    linked_clause_ids: [],    // confirmed clause IDs to be saved
    suggested_clauses: [],    // suggestions returned by CBR/keyword
  }

  const [carForm, setCarForm] = useState(initialFormState)
  const [isSubmittingCar, setIsSubmittingCar] = useState(false)
  const [carError, setCarError] = useState('')
  const [activeFinding, setActiveFinding] = useState(null)

  const [departments, setDepartments] = useState([])
  const [users, setUsers] = useState([])
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
      setUsers((userData || []).map(u => ({ 
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

  const toggleNcrSelection = (id) => {
    setCarForm(prev => {
      const isSelected = prev.ncr_ids.includes(String(id));
      if (isSelected) {
        return {
          ...prev,
          ncr_ids: prev.ncr_ids.filter(nid => nid !== String(id))
        };
      } else {
        return {
          ...prev,
          ncr_ids: [...prev.ncr_ids, String(id)]
        };
      }
    });
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
      setClausesError('Failed to fetch clause suggestions. ' + (err.message || ''))
    } finally {
      setClausesLoading(false)
    }
  }

  const handleOpenCarModal = (finding) => {
    setActiveFinding(finding)

    let details = `Audit finding: Deficiency in Clause ${finding.iso_clauses?.clause_number || ''} (${finding.iso_clauses?.title || ''}). Evidence: ${finding.evidence || 'None provided.'}`
    let ncrIds = []

    if (finding.isNcrGap) {
      details = `Escalated NCR Trend: Deficiency in Clause ${finding.iso_clauses?.clause_number || ''} (${finding.iso_clauses?.title || ''}). Active NCRs: ${finding.ncr_references.join(', ')}. Details: ${finding.evidence}`
      ncrIds = finding.ncr_ids || []
    }

    setCarForm({
      ...initialFormState,
      requestor: userName || '',
      details_of_nonconformance: details,
      ncr_ids: ncrIds.map(String)
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
      const latest = await isoService.fetchLatestCarReferenceNo()

      let nextNum = 1
      if (latest?.reference_no) {
        const match = latest.reference_no.match(/CAR-(\d+)/)
        if (match) {
          nextNum = parseInt(match[1], 10) + 1
        }
      }
      const nextRef = `CAR-${String(nextNum).padStart(3, '0')}`

      const auditScheduleId = activeFinding?.audit_runs?.schedule_id || null

      const ncrArray = carForm.ncr_ids && carForm.ncr_ids.length > 0
        ? carForm.ncr_ids.map(id => parseInt(id, 10))
        : (activeFinding?.isNcrGap ? activeFinding.ncr_ids.map(id => parseInt(id, 10)) : null)

      const insData = await isoService.createCarReport({
        reference_no: nextRef,
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
        ncr_id: ncrArray,
        status: CAR_STATUS.OPEN,
        site_id: userSiteId
      })

      // Link CAR to selected clauses + original triggering clause
      const allClauseIds = new Set(carForm.linked_clause_ids || [])
      if (activeFinding?.clause_id) {
        allClauseIds.add(activeFinding.clause_id)
      }

      if (insData?.id && allClauseIds.size > 0) {
        for (const clauseId of allClauseIds) {
          await isoService.linkCarToClause(insData.id, clauseId)
        }
      }

      setToast({
        message: `CAR ${nextRef} created successfully!`,
        type: 'success'
      })

      setCreatedCars(prev => ({ ...prev, [activeFinding.id]: nextRef }))
      setIsCarModalOpen(false)
      await fetchComplianceData()
    } catch (err) {
      console.error('[useISOCARForm] Error generating CAR:', err)
      setCarError('Failed to generate CAR. ' + err.message)
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
    loadingDropdowns,
    clausesLoading,
    clausesError,
    loadDropdownOptions,
    handleCarChange,
    toggleNcrSelection,
    toggleClauseSelection,
    fetchClauseSuggestions,
    handleOpenCarModal,
    handleSubmitCAR
  }
}
