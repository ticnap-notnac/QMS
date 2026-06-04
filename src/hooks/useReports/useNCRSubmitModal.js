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
    file: null,
    previewUrl: null,
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
      console.warn('[useNCRSubmitModal] AI suggestion failed:', err.message)
    } finally {
      setSuggestingClause(false)
    }
  }, [form.description, form.issueType, authUserId])

  const handleFile = useCallback((file) => {
    if (!file) {
      // clear file
      if (form.previewUrl) {
        try { URL.revokeObjectURL(form.previewUrl) } catch (e) {}
      }
      setForm((s) => ({ ...s, file: null, previewUrl: null }))
      setEvidenceError(null)
      return
    }

    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp']
    if (!allowed.includes(file.type)) {
      setEvidenceError('Only jpg, jpeg, png, webp images are allowed')
      return
    }
    if (file.size > 5 * 1024 * 1024) {
      setEvidenceError('Image must be under 5MB')
      return
    }

    if (form.previewUrl) {
      try { URL.revokeObjectURL(form.previewUrl) } catch (e) {}
    }
    const url = URL.createObjectURL(file)
    setEvidenceError(null)
    setForm((s) => ({ ...s, file, previewUrl: url }))
  }, [])

  const validate = useCallback(() => {
    const e = {}
    if (!form.departmentId) e.departmentId = 'Department is required'
    if (!form.severity) e.severity = 'Severity is required'
    if (!form.issueType) e.issueType = 'Issue category is required'
    if (!form.description || form.description.length < 20)
      e.description = 'Description must be at least 20 characters'
    if (form.file) {
      const allowed = ['image/png', 'image/jpeg', 'image/jpg']
      if (!allowed.includes(form.file.type)) e.file = 'Only PNG/JPEG allowed'
      if (form.file.size > 5 * 1024 * 1024) e.file = 'File must be <= 5MB'
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
      if (form.file) {
        // add both field names to be compatible with different server expectations
        fd.append('evidence', form.file)
        fd.append('file', form.file)
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
          file: null,
          previewUrl: null,
        })
        if (onSuccess) onSuccess(res.data)
      }
      return res
    } catch (err) {
      setIsSubmitting(false)
      return { success: false, message: err.message || 'Submit failed' }
    }
  }, [form, validate, onSuccess, errors])

  return {
    form,
    setField,
    handleFile,
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
