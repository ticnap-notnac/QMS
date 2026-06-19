import { useState } from 'react'
import { generateAiSuggestionFromText } from '@/services/suggestionService'

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
  const [suggesting, setSuggesting] = useState(false)

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

  const suggestActions = async () => {
    if (!form.material_description?.trim() && !form.reason_of_discrepancy?.trim()) {
      setError('Please fill in Material Description and Reason of Discrepancy first.')
      return
    }

    setSuggesting(true)
    setError(null)

    const checkboxFields = [
      { key: 'holes_punctures', label: 'HOLES & PUNCTURES' },
      { key: 'deformed_torn', label: 'DEFORMED OR TORN' },
      { key: 'open_carton', label: 'OPEN CARTON' },
      { key: 'crushed_dented', label: 'CRUSHED OR DENTED' },
      { key: 'wet_leaked', label: 'WET OR LEAKED' },
      { key: 'stain_graffiti', label: 'STAIN OR GRAFFITI' },
      { key: 'bulging', label: 'BULGING' },
      { key: 'improper_stretch_wrapping', label: 'IMPROPER STRETCH WRAPPING' },
      { key: 'wrong_no_batchcode', label: 'WRONG/NO BATCHCODE' },
      { key: 'opened_seal', label: 'OPENED SEAL' },
      { key: 'no_label_broken_label', label: 'NO LABEL/BROKEN LABEL' },
      { key: 'short_pack', label: 'SHORT PACK' },
      { key: 'excess_shipment', label: 'EXCESS SHIPMENT' },
      { key: 'documentation_error', label: 'DOCUMENTATION ERROR' },
      { key: 'picking_discrepancy', label: 'PICKING DISCREPANCY' }
    ]

    const checkedTypes = checkboxFields
      .filter(f => form[f.key])
      .map(f => f.label)
      .join(', ')

    const fullDescription = `Material: ${form.material_description || ''}. Discrepancy Type: ${checkedTypes || 'None'}. Reason: ${form.reason_of_discrepancy || ''}.`

    try {
      const res = await generateAiSuggestionFromText({
        description: fullDescription,
        issueType: checkedTypes || 'quality',
        deptName: form.location || 'N/A'
      })

      if (res) {
        setForm(prev => ({
          ...prev,
          corrective_action: res.suggestion || prev.corrective_action,
          preventive_action: res.preventive_suggestion || prev.preventive_action
        }))
      }
    } catch (err) {
      console.error('CBR suggestion error:', err)
      setError('Failed to fetch suggestions from CBR: ' + err.message)
    } finally {
      setSuggesting(false)
    }
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
    setIsSubmitting,
    suggesting,
    suggestActions
  }
}
