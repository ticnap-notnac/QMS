import { useState, useCallback, useRef, useEffect } from 'react'

const DEFAULT_FORM = {
  investigationDetails: '',
  correctiveAction: '',
  resolutionDetails: '',
  verificationDate: '',
  issueType: '',
  files: [],
  previewUrls: [],
}

export function useReportsUpdateForm({ report }) {
  const [form, setForm] = useState(DEFAULT_FORM)
  const [errors, setErrors] = useState({})
  const [error, setError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const previewUrlRef = useRef(null)

  const setField = useCallback((key, value) => {
    setForm((current) => ({ ...current, [key]: value }))
  }, [])

  const handleFiles = useCallback((newFiles) => {
    if (!newFiles || newFiles.length === 0) return

    setForm((current) => {
      const currentFiles = current.files || []
      const currentUrls = current.previewUrls || []
      
      const totalFiles = currentFiles.length + newFiles.length
      if (totalFiles > 3) {
        setError('Maximum 3 files allowed.')
        return current
      }

      const allowed = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
        'application/pdf', 'application/msword', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ]

      const validFiles = []
      const validUrls = []

      for (let i = 0; i < newFiles.length; i++) {
        const f = newFiles[i]
        if (!allowed.includes(f.type)) {
          setError('Invalid file type detected. Only images, PDFs, and Docs allowed.')
          continue
        }
        if (f.size > 5 * 1024 * 1024) {
          setError('One or more files exceed the 5MB limit.')
          continue
        }
        validFiles.push(f)
        validUrls.push({ url: URL.createObjectURL(f), type: f.type, name: f.name })
      }

      setError(null)
      return { 
        ...current, 
        files: [...currentFiles, ...validFiles], 
        previewUrls: [...currentUrls, ...validUrls] 
      }
    })
  }, [])

  const removeFile = useCallback((index) => {
    setForm((current) => {
      const newFiles = [...current.files]
      const newUrls = [...current.previewUrls]
      
      const removed = newUrls.splice(index, 1)[0]
      if (removed && removed.url) {
        try { URL.revokeObjectURL(removed.url) } catch (e) {}
      }
      newFiles.splice(index, 1)

      return { ...current, files: newFiles, previewUrls: newUrls }
    })
  }, [])

  useEffect(() => {
    if (!report) {
      setForm(DEFAULT_FORM)
      setErrors({})
      setError(null)
      return
    }
    setForm({
      investigationDetails: report.investigation_details || '',
      correctiveAction: report.corrective_action || '',
      resolutionDetails: report.resolution_details || '',
      verificationDate: report.verification_date || '',
      issueType: report.issue_type || '',
      files: [],
      previewUrls: [],
    })
    setErrors({})
    setError(null)

    return () => {
      // Cleanup URLs if necessary (usually handled on unmount)
    }
  }, [report])

  const validate = useCallback(() => {
    const nextErrors = {}
    if (!form.investigationDetails.trim()) nextErrors.investigationDetails = 'Investigation details are required.'
    if (!form.resolutionDetails.trim()) nextErrors.resolutionDetails = 'Resolution details are required.'
    if (!form.verificationDate) nextErrors.verificationDate = 'Verification date is required.'
    setErrors(nextErrors)
    return Object.keys(nextErrors).length === 0
  }, [form])

  return {
    form,
    previewUrl: form.previewUrl,
    setField,
    handleFiles,
    removeFile,
    errors,
    error,
    setError,
    isSubmitting,
    setIsSubmitting,
    validate,
  }
}
