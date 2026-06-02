import { useState } from 'react'

export function useQDDRForm() {
  const initialState = {
    location: '',
    date: '',
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
    linked_ncr_reference: ''
  }

  const [form, setForm] = useState(initialState)
  const [error, setError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const handleChange = (key, value) => {
    setForm(prev => ({ ...prev, [key]: value }))
    if (error) setError('')
  }

  const selectNcr = (id, reference) => {
    setForm(prev => ({
      ...prev,
      ncr_id: prev.ncr_id === id ? null : id,
      linked_ncr_reference: prev.ncr_id === id ? '' : reference
    }))
  }

  const resetForm = () => {
    setForm(initialState)
    setError(null)
  }

  const validate = () => {
    if (!form.location) {
      setError('Location is required.')
      return false
    }
    if (!form.material_description) {
      setError('Material Description is required.')
      return false
    }
    if (!form.reason_of_discrepancy) {
      setError('Reason of Discrepancy is required.')
      return false
    }
    setError(null)
    return true
  }

  return {
    form,
    setForm,
    handleChange,
    selectNcr,
    resetForm,
    error,
    setError,
    validate,
    isSubmitting,
    setIsSubmitting
  }
}
