import { useState, useRef } from 'react'

const DEFAULT_CREATE_FORM = {
  productType: '',
  batchNumber: '',
  location: '',
  severity: '',
  department: '',
  description: '',
  issueType: '',
  investigationText: '',
  resolutionTime: '24h',
  verificationDate: '',
  preventiveRating: 'Excellent',
}

export function useReportsForm() {
  // ── Create-form fields ──────────────────────────────────────────────────────
  const [productType, setProductType] = useState(DEFAULT_CREATE_FORM.productType)
  const [productTypeId, setProductTypeId] = useState('')
  const [batchNumber, setBatchNumber] = useState(DEFAULT_CREATE_FORM.batchNumber)
  const [location, setLocation] = useState(DEFAULT_CREATE_FORM.location)
  const [locationId, setLocationId] = useState('')
  const [severity, setSeverity] = useState(DEFAULT_CREATE_FORM.severity)
  const [department, setDepartment] = useState(DEFAULT_CREATE_FORM.department)
  const [description, setDescription] = useState(DEFAULT_CREATE_FORM.description)
  const [issueType, setIssueType] = useState(DEFAULT_CREATE_FORM.issueType)
  const [issueTypeId, setIssueTypeId] = useState('')
  const [preventiveRating, setPreventiveRating] = useState(DEFAULT_CREATE_FORM.preventiveRating)

  // ── Filters ─────────────────────────────────────────────────────────────────
  const [reportFilters, setReportFilters] = useState({ departmentId: '', status: '', severities: [], date: '' })

  // ── Evidence upload ─────────────────────────────────────────────────────────
  const fileInputRefMain = useRef(null)
  const [evidenceFileMain, setEvidenceFileMain] = useState(null)
  const [evidencePreviewMain, setEvidencePreviewMain] = useState(null)
  const [evidenceErrorMain, setEvidenceErrorMain] = useState(null)

  const resetCreateForm = () => {
    setProductType(DEFAULT_CREATE_FORM.productType)
    setProductTypeId('')
    setBatchNumber(DEFAULT_CREATE_FORM.batchNumber)
    setLocation(DEFAULT_CREATE_FORM.location)
    setLocationId('')
    setSeverity(DEFAULT_CREATE_FORM.severity)
    setDepartment(DEFAULT_CREATE_FORM.department)
    setDescription(DEFAULT_CREATE_FORM.description)
    setIssueType(DEFAULT_CREATE_FORM.issueType)
    setIssueTypeId('')
  }

  const clearEvidenceState = () => {
    if (evidencePreviewMain) {
      try { URL.revokeObjectURL(evidencePreviewMain) } catch (_) { }
    }
    setEvidenceFileMain(null)
    setEvidencePreviewMain(null)
    setEvidenceErrorMain(null)
  }

  return {
    reportFilters,
    setReportFilters,
    createFormState: {
      productType, setProductType,
      productTypeId, setProductTypeId,
      batchNumber, setBatchNumber,
      location, setLocation,
      locationId, setLocationId,
      severity, setSeverity,
      department, setDepartment,
      description, setDescription,
      issueType, setIssueType,
      issueTypeId, setIssueTypeId,
      preventiveRating, setPreventiveRating,
    },
    resetCreateForm,
    evidenceState: {
      fileInputRefMain,
      evidenceFileMain,
      setEvidenceFileMain,
      evidencePreviewMain,
      setEvidencePreviewMain,
      evidenceErrorMain,
      setEvidenceErrorMain,
    },
    clearEvidenceState
  }
}
