import { useState, useCallback, useEffect } from 'react'
import { submitNcrMultipart } from '../../services/ncrService'
import { suggestClausesForCar } from '../../services/carService'
import { supabase } from '../../utils/supabase'

export default function useNCRSubmitModal({ onSuccess, authUserId }) {
  const [form, setForm] = useState({
    departmentId: '',
    productType: '',
    productTypeId: '',
    batchNumber: '',
    location: '',
    locationId: '',
    severity: '',
    issueType: '',
    issueTypeId: '',
    description: '',
    clauseId: '',
    files: [],
    previewUrls: [],
  })
  const [errors, setErrors] = useState({})
  const [evidenceError, setEvidenceError] = useState(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [suggestingClause, setSuggestingClause] = useState(false)
  const [departments, setDepartments] = useState([])
  const [locations, setLocations] = useState([])
  const [productTypes, setProductTypes] = useState([])
  const [issueTypes, setIssueTypes] = useState([])
  const [clauses, setClauses] = useState([])
  const [loadingDropdowns, setLoadingDropdowns] = useState(false)

  const setField = useCallback((key, value) => {
    setForm((s) => ({ ...s, [key]: value }))
  }, [])

  const handleSuggestClause = useCallback(async () => {
    if (!form.description || form.description.trim().length < 15 || !authUserId) return
    setSuggestingClause(true)
    try {
      const flags = {
        quality_food_safety: form.issueType?.toLowerCase().includes('quality') || false,
        environment_health_safety: form.issueType?.toLowerCase().includes('environment') || false,
        security_issue: form.issueType?.toLowerCase().includes('security') || false,
        internal_audit: form.issueType?.toLowerCase().includes('audit') || false,
        customer_complaint: form.issueType?.toLowerCase().includes('complaint') || false,
        vendor_nonconformance: form.issueType?.toLowerCase().includes('vendor') || false,
      }
      const suggestions = await suggestClausesForCar({ description: form.description, flags }, authUserId)
      if (suggestions && suggestions.length > 0) {
        // Auto-select the top suggested clause
        setForm((s) => ({ ...s, clauseId: suggestions[0].clause_id }))
      }
    } catch (err) {
      console.warn('[useNCRSubmitModal] AI suggestion failed:', err)
    } finally {
      setSuggestingClause(false)
    }
  }, [form.description, form.issueType, authUserId])

  const handleFiles = useCallback((newFiles) => {
    if (!newFiles || newFiles.length === 0) return

    setForm((s) => {
      const currentFiles = s.files || []
      const currentUrls = s.previewUrls || []
      
      const totalFiles = currentFiles.length + newFiles.length
      if (totalFiles > 3) {
        setEvidenceError('Maximum 3 files allowed.')
        return s
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
          setEvidenceError('Invalid file type detected. Only images, PDFs, and Docs allowed.')
          continue
        }
        if (f.size > 5 * 1024 * 1024) {
          setEvidenceError('One or more files exceed the 5MB limit.')
          continue
        }
        validFiles.push(f)
        validUrls.push({ url: URL.createObjectURL(f), type: f.type, name: f.name })
      }

      setEvidenceError(null)
      return { 
        ...s, 
        files: [...currentFiles, ...validFiles], 
        previewUrls: [...currentUrls, ...validUrls] 
      }
    })
  }, [])

  const removeFile = useCallback((index) => {
    setForm((s) => {
      const newFiles = [...s.files]
      const newUrls = [...s.previewUrls]
      
      const removed = newUrls.splice(index, 1)[0]
      if (removed && removed.url) {
        try { URL.revokeObjectURL(removed.url) } catch (e) {}
      }
      newFiles.splice(index, 1)

      return { ...s, files: newFiles, previewUrls: newUrls }
    })
  }, [])

  const validate = useCallback(() => {
    const e = {}
    if (!form.departmentId) e.departmentId = 'Department is required'
    if (!form.severity) e.severity = 'Severity is required'
    if (!form.issueType) e.issueType = 'Issue category is required'
    if (!form.description || form.description.length < 20)
      e.description = 'Description must be at least 20 characters'
    if (form.files && form.files.length > 0) {
      if (form.files.length > 3) e.files = 'Maximum 3 files allowed'
      const allowed = [
        'image/jpeg', 'image/jpg', 'image/png', 'image/webp',
        'application/pdf', 'application/msword', 
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ]
      form.files.forEach(f => {
        if (!allowed.includes(f.type)) e.files = 'Invalid file type'
        if (f.size > 5 * 1024 * 1024) e.files = 'File must be <= 5MB'
      })
    }
    setErrors(e)
    return Object.keys(e).length === 0
  }, [form])

  useEffect(() => {
    let mounted = true
    const fetchDropdownData = async () => {
      setLoadingDropdowns(true)
      try {
        const [deptRes, locationRes, productRes, issueRes, clauseRes] = await Promise.all([
          supabase.from('departments').select('id, department_name').order('department_name'),
          supabase.from('locations').select('id, location_name').order('location_name'),
          // product_types table may use product_name or product_type_name; select both where available
          supabase.from('product_types').select('id, product_name, product_type_name').order('product_name'),
          supabase.from('issue_types').select('id, issue_type_name').order('issue_type_name'),
          supabase.from('iso_clauses').select('id, clause_number, title').eq('is_active', true).order('clause_number')
        ])

        if (deptRes.error) console.error('Departments error:', deptRes.error)
        if (locationRes.error) console.error('Locations error:', locationRes.error)
        if (productRes.error) console.error('Product types error:', productRes.error)
        if (issueRes.error) console.error('Issue types error:', issueRes.error)
        if (clauseRes.error) console.error('Clauses error:', clauseRes.error)

        if (!mounted) return
        setDepartments(deptRes.data || [])
        setLocations(locationRes.data || [])
        // normalize product type shape to { id, name }
        const pts = (productRes.data || []).map((p) => ({ id: p.id, name: p.product_name || p.product_type_name || '' }))
        setProductTypes(pts)
        setIssueTypes((issueRes.data || []).map((i) => ({ id: i.id, label: i.issue_type_name || '' })))
        setClauses((clauseRes.data || []).map((c) => ({ id: c.id, label: `Clause ${c.clause_number} — ${c.title}` })))
      } catch (err) {
        console.error('Failed to fetch dropdowns', err)
      } finally {
        if (mounted) setLoadingDropdowns(false)
      }
    }

    fetchDropdownData()
    return () => { mounted = false }
  }, [])

  const handleSubmit = useCallback(async (authId) => {
    if (!validate()) return { success: false, errors }
    setIsSubmitting(true)
    try {
      const fd = new FormData()
      fd.append('department_id', form.departmentId)
      fd.append('product_type', form.productType)
      fd.append('product_type_id', form.productTypeId)
      fd.append('batch_number', form.batchNumber)
      fd.append('location', form.location)
      fd.append('location_id', form.locationId)
      fd.append('severity', form.severity)
      fd.append('issue_type', form.issueType || 'ncr')
      fd.append('issue_type_id', form.issueTypeId)
      fd.append('description', form.description)
      if (form.clauseId) {
        fd.append('clause_id', form.clauseId)
      }
      if (form.files && form.files.length > 0) {
        form.files.forEach(f => {
          fd.append('evidence_files', f)
        })
      }
      const res = await submitNcrMultipart(fd, authId)
      setIsSubmitting(false)
      if (res && res.success) {
        setForm({
          departmentId: '',
          productType: '',
          productTypeId: '',
          batchNumber: '',
          location: '',
          locationId: '',
          severity: '',
          issueType: '',
          issueTypeId: '',
          description: '',
          clauseId: '',
          clauseId: '',
          files: [],
          previewUrls: [],
        })
        if (onSuccess) onSuccess(res.data)
      }
      return res
    } catch (err) {
      setIsSubmitting(false)
      return { success: false, message: 'The report could not be submitted. Please check your network and try again.' }
    }
  }, [form, validate, onSuccess, errors])

  return {
    form,
    setField,
    handleFiles,
    removeFile,
    errors,
    isSubmitting,
    suggestingClause,
    handleSuggestClause,
    handleSubmit,
    departments,
    locations,
    productTypes,
    issueTypes,
    clauses,
    loadingDropdowns,
    evidenceError,
  }
}
