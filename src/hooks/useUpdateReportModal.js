import { useCallback, useEffect, useRef, useState } from 'react'
import { updateReportInvestigationMultipart } from '@/services/ncrService'

const DEFAULT_FORM = {
  investigationDetails: '',
  resolutionDetails: '',
  resolutionTimeValue: '24',
  resolutionTimeUnit: 'hours',
  verificationDate: '',
  file: null,
  previewUrl: null,
}

function parseResolutionTime(value) {
  const text = String(value || '').trim().toLowerCase()
  if (!text) {
    return { resolutionTimeValue: '24', resolutionTimeUnit: 'hours' }
  }

  const match = text.match(/^(\d+(?:\.\d+)?)\s*(hour|hours|day|days)$/i)
  if (!match) {
    return { resolutionTimeValue: '24', resolutionTimeUnit: 'hours' }
  }

  return {
    resolutionTimeValue: match[1],
    resolutionTimeUnit: match[2].toLowerCase().startsWith('day') ? 'days' : 'hours',
  }
}

export default function useUpdateReportModal({ report, onSuccess }) {
  const [form, setForm] = useState(DEFAULT_FORM)
  const [errors, setErrors] = useState({})
  const [error, setError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const previewUrlRef = useRef(null)

  const setField = useCallback((key, value) => {
    setForm((current) => ({ ...current, [key]: value }))
  }, [])

  const handleFile = useCallback((file) => {
    setForm((current) => {
      if (current.previewUrl) {
        try { URL.revokeObjectURL(current.previewUrl) } catch (err) {}
        previewUrlRef.current = null
      }

      if (!file) {
        return { ...current, file: null, previewUrl: null }
      }

      const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
      if (!allowed.includes(file.type)) {
        setError('Only jpg, jpeg, png, webp images are allowed')
        return current
      }

      if (file.size > 5 * 1024 * 1024) {
        setError('Image must be under 5MB')
        return current
      }

      setError(null)
      const nextPreviewUrl = URL.createObjectURL(file)
      previewUrlRef.current = nextPreviewUrl
      return { ...current, file, previewUrl: nextPreviewUrl }
    })
  }, [])

  useEffect(() => {
    if (!report) {
      setForm(DEFAULT_FORM)
      setErrors({})
      setError(null)
      return
    }

    const parsedResolution = parseResolutionTime(report.resolution_time)

    setForm({
      investigationDetails: report.investigation_details || '',
      resolutionDetails: report.resolution_details || '',
      resolutionTimeValue: parsedResolution.resolutionTimeValue,
      resolutionTimeUnit: parsedResolution.resolutionTimeUnit,
      verificationDate: report.verification_date || '',
      file: null,
      previewUrl: null,
    })
    setErrors({})
    setError(null)

    return () => {
      if (previewUrlRef.current) {
        try { URL.revokeObjectURL(previewUrlRef.current) } catch (err) {}
        previewUrlRef.current = null
      }
    }
  }, [report])

  const validate = useCallback(() => {
    const nextErrors = {}

    if (!form.investigationDetails.trim()) nextErrors.investigationDetails = 'Investigation details are required.'
    if (!form.resolutionDetails.trim()) nextErrors.resolutionDetails = 'Resolution details are required.'
    if (!form.resolutionTimeValue || Number(form.resolutionTimeValue) <= 0) nextErrors.resolutionTime = 'Resolution time must be greater than zero.'
    if (!form.verificationDate) nextErrors.verificationDate = 'Verification date is required.'

    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }, [form])

  const handleSubmit = useCallback(async (event) => {
    event.preventDefault()

    if (!report?.id) {
      setError('No report selected for update.')
      return { success: false }
    }

    if (!validate()) {
      return { success: false }
    }

    setIsSubmitting(true)
    setError(null)

    try {
      const payload = new FormData()
      payload.append('investigation_details', form.investigationDetails)
      payload.append('resolution_details', form.resolutionDetails)
      payload.append('resolution_time_value', form.resolutionTimeValue)
      payload.append('resolution_time_unit', form.resolutionTimeUnit)
      payload.append('verification_date', form.verificationDate)

      if (form.file) {
        payload.append('investigation_evidence', form.file)
      }

      await updateReportInvestigationMultipart(report.id, payload)

      if (onSuccess) {
        await onSuccess()
      }

      return { success: true }
    } catch (submitError) {
      setError(submitError?.message || 'Failed to update NCR report.')
      return { success: false }
    } finally {
      setIsSubmitting(false)
    }
  }, [form, onSuccess, report, validate])

  return {
    form,
    previewUrl: form.previewUrl,
    setField,
    handleFile,
    errors,
    error,
    isSubmitting,
    handleSubmit,
  }
}
