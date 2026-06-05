import { useState } from 'react'
import { suggestClausesForCar } from '@/services/carService'

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
    ncr_ids: [],
    linked_ncr_references: [],
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

  const handleChange = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }))
    if (error) setError('')
  }

  const toggleNcrSelection = (id, reference) => {
    setForm(prev => {
      const isSelected = prev.ncr_ids.includes(String(id));
      if (isSelected) {
        return {
          ...prev,
          ncr_ids: prev.ncr_ids.filter(nid => nid !== String(id)),
          linked_ncr_references: prev.linked_ncr_references.filter(ref => ref !== reference)
        };
      } else {
        return {
          ...prev,
          ncr_ids: [...prev.ncr_ids, String(id)],
          linked_ncr_references: [...prev.linked_ncr_references, reference]
        };
      }
    });
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
      const suggestions = result?.suggestions || []
      setForm(prev => ({ ...prev, suggested_clauses: suggestions }))

      if (suggestions.length === 0) {
        setClausesError('No matching clauses found. Try adding more detail to the description.')
      }
    } catch (err) {
      setClausesError('Failed to fetch clause suggestions. ' + (err.message || ''))
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
    if (!form.requesting_department) {
      setError('Requesting Department is required.')
      return false
    }
    if (!form.details_of_nonconformance) {
      setError('Details of Non-Conformance is required.')
      return false
    }
    setError(null)
    return true
  }

  return {
    form,
    setForm,
    handleChange,
    toggleNcrSelection,
    toggleClauseSelection,
    fetchClauseSuggestions,
    clausesLoading,
    clausesError,
    resetForm,
    error,
    setError,
    validate,
    isSubmitting,
    setIsSubmitting
  }
}
