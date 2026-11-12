import { useState, useEffect, useRef } from 'react'
import { suggestClausesForCar } from '@/services/carService'
import { classifyDiscrepancyTags } from '@/services/suggestionService'

export function useCARForm() {
  const initialState = {
    reference_no: '',
    requesting_department: '',
    responsible_department: '',
    requestor: '',
    recipient: '',
    date: '',
    reason_reissue: '',
    no_reply: false,
    re_corrective_action: false,
    type_of_nonconformance: '',
    others: '',
    product_material_name: '',
    model_type: '',
    control_no: '',
    affected_quantity: '',
    details_of_nonconformance: '',
    request_date: '',
    // ISO Clause linkage
    linked_clause_ids: [],    // confirmed clause IDs to be saved
    suggested_clauses: [],    // AI-returned suggestions shown to user
  }

  const [form, setForm] = useState(initialState)
  const [error, setError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Clause suggestion loading state (kept separate to avoid polluting form)
  const [clausesLoading, setClausesLoading] = useState(false)
  const [clausesError, setClausesError] = useState(null)
  const lastClassifiedDescRef = useRef('')

  const CAR_TAG_LABELS = {
    quality_food_safety: 'Quality/Food Safety Issue',
    environment_health_safety: 'Environment, Health and Safety Issue',
    security_issue: 'Security Issue',
    internal_audit: 'Internal Audit',
    customer_complaint: 'Customer Complaint',
    government_agency_audit: 'Government Agency Audit Non-Conformance',
    customer_audit_nonconformance: 'Customer Audit Non-Conformance',
    vendor_nonconformance: 'Vendor Non-Conformance'
  }

  useEffect(() => {
    const desc = (form.details_of_nonconformance || '').trim()
    if (desc.length < 15 || desc === lastClassifiedDescRef.current) return

    const timer = setTimeout(async () => {
      try {
        lastClassifiedDescRef.current = desc
        const data = await classifyDiscrepancyTags({ description: desc, type: 'CAR' })
        if (Array.isArray(data?.tags) && data.tags.length > 0) {
          setForm(prev => {
            if (prev.type_of_nonconformance) return prev
            const matchedKey = data.tags[0]
            const typeLabel = CAR_TAG_LABELS[matchedKey] || matchedKey
            return { ...prev, type_of_nonconformance: typeLabel }
          })
        }
      } catch (err) {
        console.warn('Auto CAR tag classification failed:', err)
      }
    }, 800)

    return () => clearTimeout(timer)
  }, [form.details_of_nonconformance])

  const handleChange = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }))
    if (error) setError('')
  }

  const initForm = (existingCar) => {
    setForm({
      ...initialState,
      ...existingCar,
      // override nulls with empty strings or false to avoid controlled/uncontrolled warnings
      requesting_department: existingCar.requesting_department || '',
      responsible_department: existingCar.responsible_department || '',
      requestor: existingCar.requestor || '',
      recipient: existingCar.recipient || '',
      date: existingCar.date ? existingCar.date.split('T')[0] : '',
      request_date: existingCar.request_date ? existingCar.request_date.split('T')[0] : '',
      reason_reissue: existingCar.reason_reissue || '',
      no_reply: Boolean(existingCar.no_reply),
      re_corrective_action: Boolean(existingCar.re_corrective_action),
      type_of_nonconformance: existingCar.type_of_nonconformance || '',
      others: existingCar.others || '',
      product_material_name: existingCar.product_material_name || '',
      model_type: existingCar.model_type || '',
      control_no: existingCar.control_no || '',
      affected_quantity: existingCar.affected_quantity || '',
      details_of_nonconformance: existingCar.details_of_nonconformance || '',
      linked_clause_ids: existingCar.linked_clause_ids || [],
      suggested_clauses: existingCar.suggested_clauses || []
    })
    setError(null)
  }

  /** Confirm or remove a clause from the linked set */
  const toggleClauseSelection = (clauseId) => {
    setForm(prev => {
      const id = clauseId
      const already = prev.linked_clause_ids.includes(id)
      return {
        ...prev,
        linked_clause_ids: already
          ? prev.linked_clause_ids.filter(c => c !== id)
          : [...prev.linked_clause_ids, id]
      }
    })
  }

  /**
   * Calls the AI suggestion endpoint using the current form's description and
   * boolean flag fields. Populates suggested_clauses in state.
   *
   * @param {string} userAuthId  - Current user's auth ID for API auth header
   */
  const fetchClauseSuggestions = async (userAuthId) => {
    if (!form.details_of_nonconformance?.trim()) {
      setClausesError('Please fill in the Details of Non-Conformance first.')
      return
    }

    setClausesLoading(true)
    setClausesError(null)

    const flags = {
      type_of_nonconformance: form.type_of_nonconformance
    }

    try {
      const result = await suggestClausesForCar(
        { description: form.details_of_nonconformance, flags },
        userAuthId
      )
      const suggestions = Array.isArray(result) ? result : (result?.suggestions || [])
      setForm(prev => ({ ...prev, suggested_clauses: suggestions }))

      if (suggestions.length === 0) {
        setClausesError('No matching clauses found. Try adding more detail to the description.')
      }
    } catch (err) {
      setClausesError('We could not generate clause suggestions. Please try again.')
    } finally {
      setClausesLoading(false)
    }
  }

  const resetForm = () => {
    setForm(initialState)
    setError(null)
    setClausesError(null)
  }

  const validate = () => {
    if (!form.requesting_department?.trim()) {
      setError('Requesting Department is required.')
      return false
    }
    if (!form.requestor?.trim()) {
      setError('Requestor is required.')
      return false
    }
    if (!form.date) {
      setError('Date is required.')
      return false
    }
    if (!form.responsible_department?.trim()) {
      setError('Responsible Department is required.')
      return false
    }
    if (!form.recipient?.trim()) {
      setError('Recipient is required.')
      return false
    }

    if (!form.type_of_nonconformance?.trim()) {
      setError('Type of Non-Conformance is required.')
      return false
    }

    if (!form.details_of_nonconformance?.trim()) {
      setError('Details of Non-Conformance is required.')
      return false
    }

    if (!form.request_date) {
      setError('Request Date is required.')
      return false
    }

    setError(null)
    return true
  }

  return {
    form,
    setForm,
    handleChange,
    toggleClauseSelection,
    fetchClauseSuggestions,
    clausesLoading,
    clausesError,
    setClausesError,
    initForm,
    resetForm,
    error,
    setError,
    validate,
    isSubmitting,
    setIsSubmitting
  }
}
