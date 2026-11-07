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
    quality_food_safety: false,
    environment_health_safety: false,
    security_issue: false,
    internal_audit: false,
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

  useEffect(() => {
    const desc = (form.details_of_nonconformance || '').trim()
    if (desc.length < 15 || desc === lastClassifiedDescRef.current) return

    const timer = setTimeout(async () => {
      try {
        lastClassifiedDescRef.current = desc
        const data = await classifyDiscrepancyTags({ description: desc, type: 'CAR' })
        if (Array.isArray(data?.tags) && data.tags.length > 0) {
          setForm(prev => {
            const updates = {}
            data.tags.forEach(tag => {
              if (tag in initialState) updates[tag] = true
            })
            return { ...prev, ...updates }
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
      quality_food_safety: Boolean(existingCar.quality_food_safety),
      environment_health_safety: Boolean(existingCar.environment_health_safety),
      security_issue: Boolean(existingCar.security_issue),
      internal_audit: Boolean(existingCar.internal_audit),
      customer_complaint: Boolean(existingCar.customer_complaint),
      government_agency_audit: Boolean(existingCar.government_agency_audit),
      customer_audit_nonconformance: Boolean(existingCar.customer_audit_nonconformance),
      vendor_nonconformance: Boolean(existingCar.vendor_nonconformance),
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
      quality_food_safety: form.quality_food_safety,
      environment_health_safety: form.environment_health_safety,
      security_issue: form.security_issue,
      internal_audit: form.internal_audit,
      customer_complaint: form.customer_complaint,
      government_agency_audit: form.government_agency_audit,
      customer_audit_nonconformance: form.customer_audit_nonconformance,
      vendor_nonconformance: form.vendor_nonconformance,
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

    const hasCheckboxChecked = 
      form.quality_food_safety ||
      form.environment_health_safety ||
      form.security_issue ||
      form.internal_audit ||
      form.customer_complaint ||
      form.government_agency_audit ||
      form.customer_audit_nonconformance ||
      form.vendor_nonconformance

    if (!hasCheckboxChecked) {
      setError('Please select at least one Type of Non-Conformance checkbox.')
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
