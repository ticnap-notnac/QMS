import { useState } from 'react'

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
    linked_ncr_references: []
  }

  const [form, setForm] = useState(initialState)
  const [error, setError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

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

  const resetForm = () => {
    setForm(initialState)
    setError(null)
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
    resetForm,
    error,
    setError,
    validate,
    isSubmitting,
    setIsSubmitting
  }
}
