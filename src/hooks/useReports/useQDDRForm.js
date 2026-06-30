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

  const selectNcr = async (id, reference, report = null) => {
    setForm(prev => ({
      ...prev,
      ncr_id: prev.ncr_id === id ? null : id,
      linked_ncr_reference: prev.ncr_id === id ? '' : reference
    }))

    // AI Classification (if linking)
    if (form.ncr_id !== id && report?.description) {
      try {
        const res = await fetch('/api/suggestions/classify-tags', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ description: report.description, reportType: 'QDDR' })
        });
        if (res.ok) {
          const data = await res.json();
          if (data.tags && data.tags.length > 0) {
            setForm(prev => {
              const updates = {};
              data.tags.forEach(t => updates[t] = true);
              return { ...prev, ...updates };
            });
          }
        }
      } catch (err) {
        console.warn('Auto classification failed', err);
      }
    }
  }

  const resetForm = () => {
    setForm(initialState)
    setError(null)
  }

  const initForm = (existingQddr) => {
    setForm({
      ...initialState,
      ...existingQddr,
      // Handle potential null values to prevent uncontrolled input warnings
      location: existingQddr.location || '',
      date: existingQddr.date ? existingQddr.date.split('T')[0] : '',
      time: existingQddr.time || '',
      trucker_broker: existingQddr.trucker_broker || '',
      plate_number: existingQddr.plate_number || '',
      container_number: existingQddr.container_number || '',
      po_reference: existingQddr.po_reference || '',
      drwb_number: existingQddr.drwb_number || '',
      brand_supplier: existingQddr.brand_supplier || '',
      material_description: existingQddr.material_description || '',
      material_code: existingQddr.material_code || '',
      batch_code_su_number: existingQddr.batch_code_su_number || '',
      holes_punctures: Boolean(existingQddr.holes_punctures),
      deformed_torn: Boolean(existingQddr.deformed_torn),
      open_carton: Boolean(existingQddr.open_carton),
      crushed_dented: Boolean(existingQddr.crushed_dented),
      wet_leaked: Boolean(existingQddr.wet_leaked),
      stain_graffiti: Boolean(existingQddr.stain_graffiti),
      bulging: Boolean(existingQddr.bulging),
      improper_stretch_wrapping: Boolean(existingQddr.improper_stretch_wrapping),
      wrong_no_batchcode: Boolean(existingQddr.wrong_no_batchcode),
      opened_seal: Boolean(existingQddr.opened_seal),
      no_label_broken_label: Boolean(existingQddr.no_label_broken_label),
      short_pack: Boolean(existingQddr.short_pack),
      excess_shipment: Boolean(existingQddr.excess_shipment),
      documentation_error: Boolean(existingQddr.documentation_error),
      picking_discrepancy: Boolean(existingQddr.picking_discrepancy),
      others: existingQddr.others || '',
      qty: existingQddr.qty || '',
      reason_of_discrepancy: existingQddr.reason_of_discrepancy || '',
      corrective_action: existingQddr.corrective_action || '',
      preventive_action: existingQddr.preventive_action || '',
      approved_by: existingQddr.approved_by || '',
      noted_by: existingQddr.noted_by || '',
      leader: existingQddr.leader || '',
      ncr_id: existingQddr.ncr_id || null,
      linked_ncr_reference: existingQddr.linked_ncr_reference || ''
    })
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
      setError('We could not generate suggestions. Please try again later.')
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
    initForm,
    error,
    setError,
    validate,
    isSubmitting,
    setIsSubmitting,
    suggesting,
    suggestActions
  }
}
