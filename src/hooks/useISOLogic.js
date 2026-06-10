import { useState, useEffect, useCallback } from 'react'
import { supabase } from '@/utils/supabase'
import { SEVERITY_LEVELS, REPORT_STATUS, CAR_STATUS, AUDIT_STATUS } from '../../shared/constants'

export default function useISOLogic({ userName }) {
  const [isSelectionModalOpen, setIsSelectionModalOpen] = useState(false)
  const [isAuditTaskModalOpen, setIsAuditTaskModalOpen] = useState(false)
  const [isCapaTaskModalOpen, setIsCapaTaskModalOpen] = useState(false)
  const [isDocumentTaskModalOpen, setIsDocumentTaskModalOpen] = useState(false)
  const [isTrainingTaskModalOpen, setIsTrainingTaskModalOpen] = useState(false)
  const [toast, setToast] = useState(null)
 
  const [activeModules, setActiveModules] = useState([])
  const [loadingModules, setLoadingModules] = useState(false)
  const [isModulesModalOpen, setIsModulesModalOpen] = useState(false)
  const [selectedModule, setSelectedModule] = useState(null)
  const [clauses, setClauses] = useState([])
  const [loadingClauses, setLoadingClauses] = useState(false)
 
  // Dynamic compliance states
  const [compliantCount, setCompliantCount] = useState(0)
  const [partialCount, setPartialCount] = useState(0)
  const [gapCount, setGapCount] = useState(0)
  const [overallScore, setOverallScore] = useState(100)
 
  // Gaps Action Center states
  const [nonCompliantFindings, setNonCompliantFindings] = useState([])
  const [createdCars, setCreatedCars] = useState({})
 
  // CAR Modal Form integration states
  const [isCarModalOpen, setIsCarModalOpen] = useState(false)
  const [carForm, setCarForm] = useState({
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
    internal_audit: true,
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
    ncr_ids: []
  })
  const [isSubmittingCar, setIsSubmittingCar] = useState(false)
  const [carError, setCarError] = useState('')
  const [activeFinding, setActiveFinding] = useState(null)
  
  const [departments, setDepartments] = useState([])
  const [users, setUsers] = useState([])
  const [loadingDropdowns, setLoadingDropdowns] = useState(false)
 
  const loadDropdownOptions = useCallback(async () => {
    try {
      setLoadingDropdowns(true)
      const { data: deptData } = await supabase.from('departments').select('id, department_name')
      const { data: userData } = await supabase.from('users').select('id, first_name, last_name, user_name')
      
      setDepartments((deptData || []).map(d => ({ id: d.id, label: d.department_name })))
      setUsers((userData || []).map(u => ({ 
        id: u.id, 
        label: `${u.first_name || ''} ${u.last_name || ''}`.trim() || u.user_name || 'Unnamed' 
      })))
    } catch (err) {
      console.error('Error loading dropdown options:', err)
    } finally {
      setLoadingDropdowns(false)
    }
  }, [])
 
  const fetchComplianceData = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('audit_results')
        .select('status')
      
      if (error) throw error
 
      let comp = 0
      let part = 0
      let gp = 0
 
      const rows = data || []
      rows.forEach(row => {
        if (row.status === AUDIT_STATUS.COMPLIANT) comp++
        else if (row.status === AUDIT_STATUS.PARTIAL) part++
        else if (row.status === AUDIT_STATUS.NON_COMPLIANT) gp++
      })

      const total = comp + part + gp
      
      setCompliantCount(comp)
      setPartialCount(part)
      setGapCount(gp)

      if (total > 0) {
        const score = Math.round((comp / total) * 100)
        setOverallScore(score)
      } else {
        setOverallScore(100)
      }

      const { data: findingsData, error: findingsError } = await supabase
        .from('audit_results')
        .select(`
          id,
          evidence,
          clause_id,
          run_id,
          audit_runs (
            schedule_id
          ),
          iso_clauses (
            clause_number,
            title
          )
        `)
        .eq('status', AUDIT_STATUS.NON_COMPLIANT)
      
      if (findingsError) throw findingsError
 
      // Fetch active NCRs
      const { data: ncrData, error: ncrError } = await supabase
        .from('ncr_reports')
        .select(`
          id,
          reference_no,
          severity,
          clause_id,
          description,
          iso_clauses (
            clause_number,
            title
          )
        `)
        .not('status', 'ilike', REPORT_STATUS.CLOSED)
 
      if (ncrError) throw ncrError
 
      // Group active NCRs by clause_id in memory
      const ncrGroups = {}
      const unlinkedEscalations = []
 
      if (ncrData) {
        ncrData.forEach(ncr => {
          const cid = ncr.clause_id
          if (cid) {
            if (!ncrGroups[cid]) {
              ncrGroups[cid] = {
                clause: ncr.iso_clauses,
                ncrs: []
              }
            }
            ncrGroups[cid].ncrs.push(ncr)
          } else {
            const sev = String(ncr.severity || '').trim().toLowerCase()
            if ([SEVERITY_LEVELS.HIGH, SEVERITY_LEVELS.CRITICAL].includes(sev)) {
              unlinkedEscalations.push({
                id: `ncr-unlinked-${ncr.id}`,
                isNcrGap: true,
                clause_id: null,
                iso_clauses: { clause_number: 'N/A', title: 'High Severity Issue (Unlinked)' },
                evidence: `Escalated Alert: High/Critical severity report [${ncr.reference_no}] has been submitted. Description: ${ncr.description}`,
                ncr_ids: [ncr.id],
                ncr_references: [ncr.reference_no]
              })
            }
          }
        })
      }
 
      // Check thresholds: Low >= 3, Medium >= 2, High/Critical >= 1
      const escalatedFindings = [...unlinkedEscalations]
      Object.entries(ncrGroups).forEach(([clauseId, group]) => {
        const lowNcrs = group.ncrs.filter(n => String(n.severity || '').trim().toLowerCase() === SEVERITY_LEVELS.LOW)
        const medNcrs = group.ncrs.filter(n => String(n.severity || '').trim().toLowerCase() === SEVERITY_LEVELS.MEDIUM)
        const highNcrs = group.ncrs.filter(n => [SEVERITY_LEVELS.HIGH, SEVERITY_LEVELS.CRITICAL].includes(String(n.severity || '').trim().toLowerCase()))
 
        const lowCount = lowNcrs.length
        const medCount = medNcrs.length
        const highCount = highNcrs.length
 
        if (lowCount >= 3 || medCount >= 2 || highCount >= 1) {
          const details = []
          if (highCount > 0) details.push(`${highCount} High/Critical`)
          if (medCount > 0) details.push(`${medCount} Medium`)
          if (lowCount > 0) details.push(`${lowCount} Low`)
 
          const matchedNcrs = [...highNcrs, ...medNcrs, ...lowNcrs]
 
          escalatedFindings.push({
            id: `ncr-gap-${clauseId}`,
            isNcrGap: true,
            clause_id: clauseId,
            iso_clauses: group.clause,
            evidence: `Escalated NCR Trend: ${matchedNcrs.length} active NCRs (${details.join(', ')}) violating this clause. Affected: ${matchedNcrs.map(n => n.reference_no).join(', ')}`,
            ncr_ids: matchedNcrs.map(n => n.id),
            ncr_references: matchedNcrs.map(n => n.reference_no)
          })
        }
      })
 
      setNonCompliantFindings([...(findingsData || []), ...escalatedFindings])

    } catch (err) {
      console.error('Error fetching compliance data:', err)
    }
  }, [])

  const handleCarChange = (key, value) => {
    setCarForm(prev => ({ ...prev, [key]: value }))
    if (carError) setCarError('')
  }

  const toggleNcrSelection = (id, reference) => {
    setCarForm(prev => {
      const isSelected = prev.ncr_ids.includes(String(id));
      if (isSelected) {
        return {
          ...prev,
          ncr_ids: prev.ncr_ids.filter(nid => nid !== String(id))
        };
      } else {
        return {
          ...prev,
          ncr_ids: [...prev.ncr_ids, String(id)]
        };
      }
    });
  }

  const handleOpenCarModal = (finding) => {
    setActiveFinding(finding)

    let details = `Audit finding: Deficiency in Clause ${finding.iso_clauses?.clause_number || ''} (${finding.iso_clauses?.title || ''}). Evidence: ${finding.evidence || 'None provided.'}`
    let ncrIds = []

    if (finding.isNcrGap) {
      details = `Escalated NCR Trend: Deficiency in Clause ${finding.iso_clauses?.clause_number || ''} (${finding.iso_clauses?.title || ''}). Active NCRs: ${finding.ncr_references.join(', ')}. Details: ${finding.evidence}`
      ncrIds = finding.ncr_ids || []
    }

    setCarForm({
      requesting_department: '',
      responsible_department: '',
      requestor: userName || '',
      recipient: '',
      date: new Date().toISOString().split('T')[0],
      reason_reissue: '',
      no_reply: false,
      re_corrective_action: false,
      quality_food_safety: false,
      environment_health_safety: false,
      security_issue: false,
      internal_audit: true,
      customer_complaint: false,
      government_agency_audit: false,
      customer_audit_nonconformance: false,
      vendor_nonconformance: false,
      others: '',
      product_material_name: '',
      model_type: '',
      control_no: '',
      affected_quantity: '',
      details_of_nonconformance: details,
      request_date: new Date().toISOString().split('T')[0],
      ncr_ids: ncrIds.map(String)
    })
    setCarError('')
    setIsCarModalOpen(true)
  }

  const handleSubmitCAR = async (e) => {
    if (e) e.preventDefault()
    setIsSubmittingCar(true)
    setCarError('')
    try {
      const { data: latest, error: latError } = await supabase
        .from('car_reports')
        .select('reference_no')
        .ilike('reference_no', 'CAR-%')
        .order('reference_no', { ascending: false })
        .limit(1)
        .maybeSingle()

      if (latError) throw latError

      let nextNum = 1
      if (latest?.reference_no) {
        const match = latest.reference_no.match(/CAR-(\d+)/)
        if (match) {
          nextNum = parseInt(match[1], 10) + 1
        }
      }
      const nextRef = `CAR-${String(nextNum).padStart(3, '0')}`

      // Resolve the audit schedule ID from the active finding
      const auditScheduleId = activeFinding?.audit_runs?.schedule_id || null

      const ncrArray = carForm.ncr_ids && carForm.ncr_ids.length > 0
        ? carForm.ncr_ids.map(id => parseInt(id, 10))
        : (activeFinding?.isNcrGap ? activeFinding.ncr_ids.map(id => parseInt(id, 10)) : null)

      const { data: insData, error: insError } = await supabase
        .from('car_reports')
        .insert({
          reference_no: nextRef,
          requesting_department: carForm.requesting_department,
          responsible_department: carForm.responsible_department,
          requestor: carForm.requestor,
          recipient: carForm.recipient,
          date: carForm.date || null,
          reason_reissue: carForm.reason_reissue || null,
          no_reply: carForm.no_reply,
          re_corrective_action: carForm.re_corrective_action,
          quality_food_safety: carForm.quality_food_safety,
          environment_health_safety: carForm.environment_health_safety,
          security_issue: carForm.security_issue,
          internal_audit: carForm.internal_audit,
          customer_complaint: carForm.customer_complaint,
          government_agency_audit: carForm.government_agency_audit,
          customer_audit_nonconformance: carForm.customer_audit_nonconformance,
          vendor_nonconformance: carForm.vendor_nonconformance,
          others: carForm.others || null,
          product_material_name: carForm.product_material_name || null,
          model_type: carForm.model_type || null,
          control_no: carForm.control_no || null,
          affected_quantity: carForm.affected_quantity ? parseInt(carForm.affected_quantity, 10) : null,
          details_of_nonconformance: carForm.details_of_nonconformance,
          request_date: carForm.request_date || null,
          audit_schedule_id: auditScheduleId,
          ncr_id: ncrArray,
          status: CAR_STATUS.OPEN
        })
        .select('id')
        .maybeSingle()

      if (insError) throw insError

      // Auto-link CAR to the ISO clause that triggered it (ISO Page flow).
      // The clause is always known here since CARs are generated from non-compliant findings.
      if (insData?.id && activeFinding?.clause_id) {
        const { error: linkError } = await supabase
          .from('car_clause_links')
          .upsert(
            [{ car_report_id: insData.id, clause_id: activeFinding.clause_id }],
            { onConflict: 'car_report_id,clause_id', ignoreDuplicates: true }
          )
        if (linkError) {
          console.warn('[useISOLogic] Could not link CAR to clause:', linkError.message)
        }
      }

      setToast({
        message: `CAR ${nextRef} created successfully for Clause ${activeFinding.iso_clauses?.clause_number}!`,
        type: 'success'
      })

      setCreatedCars(prev => ({ ...prev, [activeFinding.id]: nextRef }))
      setIsCarModalOpen(false)
    } catch (err) {
      console.error('Error generating CAR:', err)
      setCarError('Failed to generate CAR. ' + err.message)
    } finally {
      setIsSubmittingCar(false)
    }
  }

  useEffect(() => {
    fetchComplianceData()
    loadDropdownOptions()
  }, [fetchComplianceData, loadDropdownOptions])

  const fetchActiveModules = async () => {
    setLoadingModules(true);
    setIsModulesModalOpen(true);
    try {
      const { data, error } = await supabase
        .from('iso_standards')
        .select('id, name, version, description')
        .eq('is_active', true)
        .order('name', { ascending: true });

      if (error) throw error;
      setActiveModules(data || []);
    } catch (err) {
      console.error('Error fetching active ISO standards:', err);
      setToast({ message: 'Failed to load active ISO modules.', type: 'error' });
      setIsModulesModalOpen(false);
    } finally {
      setLoadingModules(false);
    }
  }

  const fetchClausesForModule = async (module) => {
    setLoadingClauses(true);
    setSelectedModule(module);
    try {
      const { data: groups, error: groupError } = await supabase
        .from('iso_clause_groups')
        .select('id')
        .eq('standard_id', module.id);

      if (groupError) throw groupError;
      if (!groups || groups.length === 0) {
        setClauses([]);
        return;
      }

      const groupIds = groups.map(g => g.id);

      const { data: clausesData, error: clausesError } = await supabase
        .from('iso_clauses')
        .select('clause_number, title, description')
        .in('group_id', groupIds);

      if (clausesError) throw clausesError;

      const sorted = (clausesData || []).sort((a, b) =>
        a.clause_number.localeCompare(b.clause_number, undefined, { numeric: true })
      );
      setClauses(sorted);
    } catch (err) {
      console.error('Error fetching clauses for ISO standard:', err);
      setToast({ message: 'Failed to load ISO clauses.', type: 'error' });
      setSelectedModule(null);
    } finally {
      setLoadingClauses(false);
    }
  }

  const openAuditTask = () => { setIsSelectionModalOpen(false); setIsAuditTaskModalOpen(true); }
  const openCapaTask = () => { setIsSelectionModalOpen(false); setIsCapaTaskModalOpen(true); }
  const openDocumentTask = () => { setIsSelectionModalOpen(false); setIsDocumentTaskModalOpen(true); }
  const openTrainingTask = () => { setIsSelectionModalOpen(false); setIsTrainingTaskModalOpen(true); }

  const handleTaskCreation = (taskName) => {
    setIsAuditTaskModalOpen(false)
    setIsCapaTaskModalOpen(false)
    setIsDocumentTaskModalOpen(false)
    setIsTrainingTaskModalOpen(false)

    setToast({
      message: `${taskName} was initialized and committed securely!`,
      type: 'success'
    })
  }

  const totalResults = compliantCount + partialCount + gapCount
  const compliantPct = totalResults > 0 ? Math.round((compliantCount / totalResults) * 100) : 100
  const partialPct = totalResults > 0 ? Math.round((partialCount / totalResults) * 100) : 0
  const gapPct = totalResults > 0 ? Math.round((gapCount / totalResults) * 100) : 0

  const modulesModalProps = {
    isOpen: isModulesModalOpen,
    onClose: () => { setIsModulesModalOpen(false); setSelectedModule(null); },
    selectedModule,
    setSelectedModule,
    loadingClauses,
    clauses,
    loadingModules,
    activeModules,
    fetchClausesForModule
  }

  const taskSelectionModalProps = {
    isOpen: isSelectionModalOpen,
    onClose: () => setIsSelectionModalOpen(false),
    openAuditTask,
    openCapaTask,
    openDocumentTask,
    openTrainingTask
  }

  const carModalProps = {
    isOpen: isCarModalOpen,
    onClose: () => setIsCarModalOpen(false),
    form: carForm,
    handleChange: handleCarChange,
    toggleNcrSelection,
    error: carError,
    isSubmitting: isSubmittingCar,
    onSubmit: handleSubmitCAR,
    departments,
    departmentsLoading: loadingDropdowns,
    users,
    usersLoading: loadingDropdowns,
    allReports: []
  }

  return {
    toast,
    setToast,
    overallScore,
    fetchActiveModules,
    compliantPct,
    partialPct,
    gapPct,
    nonCompliantFindings,
    createdCars,
    handleOpenCarModal,
    setIsSelectionModalOpen,
    modulesModalProps,
    taskSelectionModalProps,
    carModalProps,
    isAuditTaskModalOpen,
    setIsAuditTaskModalOpen,
    isCapaTaskModalOpen,
    setIsCapaTaskModalOpen,
    isDocumentTaskModalOpen,
    setIsDocumentTaskModalOpen,
    isTrainingTaskModalOpen,
    setIsTrainingTaskModalOpen,
    handleTaskCreation
  }
}
