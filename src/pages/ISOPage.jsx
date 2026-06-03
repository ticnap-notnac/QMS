import { useState, useEffect } from 'react'
import { supabase } from '@/utils/supabase'
import CARModal from '../components/Modals/CARModal.jsx' // 📝 Import the pre-filled CAR modal component

import Toast from '../components/UI/Toast.jsx' // 🍞 Import our toast notification component
import {
  X,
  ClipboardCheck,
  AlertTriangle,
  FileText,
  GraduationCap,
  CheckCircle2,
  AlertCircle,
  HelpCircle
} from 'lucide-react'
import './ISOPage.css' // 🔌 Link our separated stylesheet module directly!

function ISOPage({ userRole, userName }) {
  const [isSelectionModalOpen, setIsSelectionModalOpen] = useState(false);
  const [isAuditTaskModalOpen, setIsAuditTaskModalOpen] = useState(false);
  const [isCapaTaskModalOpen, setIsCapaTaskModalOpen] = useState(false);
  const [isDocumentTaskModalOpen, setIsDocumentTaskModalOpen] = useState(false);
  const [isTrainingTaskModalOpen, setIsTrainingTaskModalOpen] = useState(false);
  const [toast, setToast] = useState(null); // Active state for information alerts

  const [activeModules, setActiveModules] = useState([]);
  const [loadingModules, setLoadingModules] = useState(false);
  const [isModulesModalOpen, setIsModulesModalOpen] = useState(false);
  const [selectedModule, setSelectedModule] = useState(null);
  const [clauses, setClauses] = useState([]);
  const [loadingClauses, setLoadingClauses] = useState(false);

  // Dynamic compliance states
  const [compliantCount, setCompliantCount] = useState(0);
  const [partialCount, setPartialCount] = useState(0);
  const [gapCount, setGapCount] = useState(0);
  const [overallScore, setOverallScore] = useState(100);

  // Gaps Action Center states
  const [nonCompliantFindings, setNonCompliantFindings] = useState([]);
  const [createdCars, setCreatedCars] = useState({});

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

  const loadDropdownOptions = async () => {
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
  }

  const fetchComplianceData = async () => {
    try {
      // 1. Fetch compliance evaluations
      const { data, error } = await supabase
        .from('audit_results')
        .select('status')
      
      console.log('ISOPage audit_results fetch status:', data, 'error:', error)
      if (error) throw error

      let comp = 0
      let part = 0
      let gp = 0

      const rows = data || []
      rows.forEach(row => {
        if (row.status === 'compliant') comp++
        else if (row.status === 'partial') part++
        else if (row.status === 'non_compliant') gp++
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

      // 2. Fetch active non-compliant findings with clause info
      const { data: findingsData, error: findingsError } = await supabase
        .from('audit_results')
        .select(`
          id,
          evidence,
          clause_id,
          iso_clauses (
            clause_number,
            title
          )
        `)
        .eq('status', 'non_compliant')
      
      console.log('ISOPage non-compliant findings fetch:', findingsData, 'error:', findingsError)
      if (findingsError) throw findingsError
      setNonCompliantFindings(findingsData || [])

    } catch (err) {
      console.error('Error fetching compliance data:', err)
    }
  }

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
      details_of_nonconformance: `Audit finding: Deficiency in Clause ${finding.iso_clauses?.clause_number || ''} (${finding.iso_clauses?.title || ''}). Evidence: ${finding.evidence || 'None provided.'}`,
      request_date: new Date().toISOString().split('T')[0],
      ncr_ids: []
    })
    setCarError('')
    setIsCarModalOpen(true)
  }

  const handleSubmitCAR = async (e) => {
    if (e) e.preventDefault()
    setIsSubmittingCar(true)
    setCarError('')
    try {
      // 1. Fetch latest reference number to generate next in sequence
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

      // 2. Insert new CAR report
      const { error: insError } = await supabase
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
          status: 'open'
        })

      if (insError) throw insError

      setToast({
        message: `CAR ${nextRef} created successfully for Clause ${activeFinding.iso_clauses?.clause_number}!`,
        type: 'success'
      })

      // Mark as generated in session state
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
  }, [])

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
  };

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
  };

  const openAuditTask = () => { setIsSelectionModalOpen(false); setIsAuditTaskModalOpen(true); };
  const openCapaTask = () => { setIsSelectionModalOpen(false); setIsCapaTaskModalOpen(true); };
  const openDocumentTask = () => { setIsSelectionModalOpen(false); setIsDocumentTaskModalOpen(true); };
  const openTrainingTask = () => { setIsSelectionModalOpen(false); setIsTrainingTaskModalOpen(true); };

  // Helper handler to mimic real user interaction and announce success
  const handleTaskCreation = (taskName) => {
    setIsAuditTaskModalOpen(false);
    setIsCapaTaskModalOpen(false);
    setIsDocumentTaskModalOpen(false);
    setIsTrainingTaskModalOpen(false);

    // Fire a success toast notification pop-up
    setToast({
      message: `${taskName} was initialized and committed securely!`,
      type: 'success'
    });
  };

  const normalizedRole = String(userRole || '').trim().toLowerCase()
  const isAuthorized = normalizedRole === 'admin' || normalizedRole === 'auditor'

  if (!isAuthorized) {
    return (
      <main className="dashboard page-root" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '80vh' }}>
        <div className="metric-card" style={{ maxWidth: '480px', width: '90%', textAlign: 'center', padding: '40px 24px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '16px', border: '1px solid rgba(239, 68, 68, 0.2)', background: 'rgba(15, 23, 42, 0.4)' }}>
          <div style={{ width: '60px', height: '60px', borderRadius: '50%', background: 'rgba(239, 68, 68, 0.15)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#ef4444', marginBottom: '8px' }}>
            <X size={32} />
          </div>
          <h2 style={{ fontSize: '20px', fontWeight: '700', color: '#f8fafc', margin: 0 }}>Access Denied</h2>
          <p style={{ fontSize: '14px', color: '#94a3b8', lineHeight: '1.5', margin: 0 }}>
            You do not have permission to view the ISO Compliance panel. Only quality auditors and system administrators are authorized to access this section.
          </p>
        </div>
      </main>
    )
  }

  const totalResults = compliantCount + partialCount + gapCount;
  const compliantPct = totalResults > 0 ? Math.round((compliantCount / totalResults) * 100) : 100;
  const partialPct = totalResults > 0 ? Math.round((partialCount / totalResults) * 100) : 0;
  const gapPct = totalResults > 0 ? Math.round((gapCount / totalResults) * 100) : 0;

  return (
    <main className="dashboard page-root">
      {/* 🍞 Dynamic Toast Alert Handler */}
      {toast && (
        <Toast
          message={toast.message}
          type={toast.type}
          onClose={() => setToast(null)}
        />
      )}

      <div className="page-main iso-page-main">

        {/* 📐 TOP GRID ROW: Split-Pane compliance tracking card structure */}
        <div className="iso-top-grid">

          {/* Left Block Stack: Metrics & Sub-buttons */}
          <div className="iso-left-stack">
            <div className="metric-card iso-compliance-card">
              <span className="metric-subtext">ISO Compliance:</span>
              <h2 className="metric-value iso-compliance-value">{overallScore}%</h2>
            </div>

            <div className="iso-button-grid">
              <button
                type="button"
                className="btn-metric-card iso-metric-button"
                onClick={fetchActiveModules}
              >
                ISO Modules
              </button>
              <button
                type="button"
                className="btn-metric-card iso-metric-button"
                onClick={() => setToast({ message: "Fetching audit regulatory clause checklists...", type: 'info' })}
              >
                ISO Requirements
              </button>
            </div>
          </div>

          {/* Right Block: Compliance Analysis Graph Canvas */}
          <div className="metric-card iso-graph-card">
            <span className="graph-placeholder-text iso-graph-placeholder-text">Compliance Analysis Graph Canvas</span>
          </div>

        </div>

        {/* 📊 BOTTOM WORKSPACE: Review Clause Progress Tracker panel container */}
        <div className="metric-card metric-card--padded iso-review-card">
          <h3 className="metric-card-title iso-review-title">Review Clause Status:</h3>
          <div className="iso-progress-stack">
            <ProgressRow label="Compliant" tone="success" percent={compliantPct} icon={<CheckCircle2 size={14} />} />
            <ProgressRow label="Partial" tone="warning" percent={partialPct} icon={<AlertCircle size={14} />} />
            <ProgressRow label="Gap" tone="danger" percent={gapPct} icon={<HelpCircle size={14} />} />
          </div>
        </div>

        {/* ⚠️ GAPS ACTION CENTER: Manual Corrective Action Request (CAR) generator panel */}
        <div className="metric-card metric-card--padded" style={{ margin: 0, padding: '32px' }}>
          <h3 className="metric-card-title iso-review-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertTriangle size={18} className="icon-amber" />
            Gaps & Deficiencies Action Center
          </h3>
          <p style={{ color: '#94a3b8', fontSize: '13.5px', marginTop: '-12px', marginBottom: '20px', lineHeight: '1.4' }}>
            Review non-compliant clauses identified during audits and generate Corrective Action Requests (CAR) to resolve them.
          </p>
          
          {nonCompliantFindings.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '24px 0', color: '#64748b', fontSize: '14px', border: '1px dashed rgba(255,255,255,0.06)', borderRadius: '8px', background: 'rgba(255,255,255,0.01)' }}>
              No active non-compliance gaps found. Great job!
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {nonCompliantFindings.map((finding) => (
                <div 
                  key={finding.id}
                  style={{
                    padding: '16px',
                    borderRadius: '8px',
                    background: 'rgba(239, 68, 68, 0.03)',
                    border: '1px solid rgba(239, 68, 68, 0.15)',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    gap: '16px',
                    flexWrap: 'wrap'
                  }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', flex: 1, minWidth: '240px' }}>
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <span style={{ fontSize: '11px', background: 'rgba(239, 68, 68, 0.15)', color: '#f87171', padding: '2px 6px', borderRadius: '4px', fontWeight: 'bold' }}>
                        Clause {finding.iso_clauses?.clause_number || 'N/A'}
                      </span>
                      <strong style={{ fontSize: '14px', color: '#f8fafc' }}>
                        {finding.iso_clauses?.title || 'Unknown Clause'}
                      </strong>
                    </div>
                    {finding.evidence && (
                      <p style={{ fontSize: '13px', color: '#94a3b8', margin: '4px 0 0 0', lineHeight: '1.4' }}>
                        <span style={{ color: '#64748b', fontWeight: '500' }}>Evidence: </span>
                        {finding.evidence}
                      </p>
                    )}
                  </div>
                  
                  <div>
                    {createdCars[finding.id] ? (
                      <div 
                        style={{
                          fontSize: '13px',
                          color: '#10b981',
                          background: 'rgba(16, 185, 129, 0.1)',
                          padding: '8px 16px',
                          borderRadius: '6px',
                          border: '1px solid rgba(16, 185, 129, 0.2)',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <CheckCircle2 size={14} />
                        CAR Generated ({createdCars[finding.id]})
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleOpenCarModal(finding)}
                        className="btn-gradient-primary"
                        style={{
                          padding: '8px 16px',
                          fontSize: '13px',
                          fontWeight: '600',
                          background: 'linear-gradient(135deg, #ef4444 0%, #b91c1c 100%)',
                          border: 'none',
                          boxShadow: '0 4px 12px rgba(239, 68, 68, 0.2)'
                        }}
                      >
                        Generate CAR
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* 🚀 CTA FOOTER ROW: Float Create Action button exactly to the right hand edge */}
        <div className="iso-cta-row">
          <button type="button" onClick={() => setIsSelectionModalOpen(true)} className="btn-gradient-primary iso-cta-button">
            Create ISO Tasks
          </button>
        </div>
      </div>

      {/* Choice Modal */}
      {isSelectionModalOpen && (
        <div className="iso-modal-overlay">
          <div className="iso-modal-card">

            {/* Modal Top Navigation Header Bar */}
            <div className="iso-modal-header">
              <button
                type="button"
                onClick={() => setIsSelectionModalOpen(false)}
                className="iso-modal-icon-button"
                title="Go back"
              >
                <span className="iso-back-arrow">←</span>
              </button>

              <button
                type="button"
                onClick={() => setIsSelectionModalOpen(false)}
                className="iso-modal-icon-button"
                title="Close window"
              >
                <X size={18} />
              </button>
            </div>

            {/* 2x2 Clean Task Item Grid Matrix */}
            <div className="iso-task-grid">
              <div className="iso-task-item-button" onClick={openAuditTask}>
                <ClipboardCheck size={20} className="icon-cyan iso-task-icon" />
                <span className="iso-task-item-text">Internal Audit Task</span>
              </div>

              <div className="iso-task-item-button" onClick={openCapaTask}>
                <AlertTriangle size={20} className="icon-amber iso-task-icon" />
                <span className="iso-task-item-text">CAPA Task</span>
              </div>

              <div className="iso-task-item-button" onClick={openDocumentTask}>
                <FileText size={20} className="icon-blue iso-task-icon" />
                <span className="iso-task-item-text">Document Update Task</span>
              </div>

              <div className="iso-task-item-button" onClick={openTrainingTask}>
                <GraduationCap size={20} className="icon-green iso-task-icon" />
                <span className="iso-task-item-text">Training Task</span>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* Individual Action Task Sub-Modals */}
      {isAuditTaskModalOpen && (
        <div className="iso-modal-overlay">
          <div className="iso-modal-card">
            <button onClick={() => setIsAuditTaskModalOpen(false)} className="iso-modal-close-absolute" aria-label="Close window">
              <X size={18} />
            </button>
            <h3 className="iso-submodal-title">Internal Audit Task</h3>
            <div className="workspace-placeholder iso-submodal-canvas">
              <span className="placeholder-text iso-graph-placeholder-text">Task Configuration Workspace</span>
            </div>
            <div className="iso-submodal-submit-row">
              <button onClick={() => handleTaskCreation("Internal Audit Task")} className="btn-secondary-light iso-submodal-submit-button">
                Create Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* CAPA Sub-Modal */}
      {isCapaTaskModalOpen && (
        <div className="iso-modal-overlay">
          <div className="iso-modal-card">
            <button onClick={() => setIsCapaTaskModalOpen(false)} className="iso-modal-close-absolute" aria-label="Close window">
              <X size={18} />
            </button>
            <h3 className="iso-submodal-title">CAPA Task</h3>
            <div className="workspace-placeholder iso-submodal-canvas">
              <span className="placeholder-text iso-graph-placeholder-text">CAPA Task Configuration Canvas</span>
            </div>
            <div className="iso-submodal-submit-row">
              <button onClick={() => handleTaskCreation("CAPA Task")} className="btn-secondary-light iso-submodal-submit-button">
                Create Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Document Task Sub-Modal */}
      {isDocumentTaskModalOpen && (
        <div className="iso-modal-overlay">
          <div className="iso-modal-card">
            <button onClick={() => setIsDocumentTaskModalOpen(false)} className="iso-modal-close-absolute" aria-label="Close window">
              <X size={18} />
            </button>
            <h3 className="iso-submodal-title">Document Update Task</h3>
            <div className="workspace-placeholder iso-submodal-canvas">
              <span className="placeholder-text iso-graph-placeholder-text">Document Update Workspace Canvas</span>
            </div>
            <div className="iso-submodal-submit-row">
              <button onClick={() => handleTaskCreation("Document Update Task")} className="btn-secondary-light iso-submodal-submit-button">
                Create Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Training Sub-Modal */}
      {isTrainingTaskModalOpen && (
        <div className="iso-modal-overlay">
          <div className="iso-modal-card">
            <button onClick={() => setIsTrainingTaskModalOpen(false)} className="iso-modal-close-absolute" aria-label="Close window">
              <X size={18} />
            </button>
            <h3 className="iso-submodal-title">Training Task</h3>
            <div className="workspace-placeholder iso-submodal-canvas">
              <span className="placeholder-text iso-graph-placeholder-text">Training Program Configuration Canvas</span>
            </div>
            <div className="iso-submodal-submit-row">
              <button onClick={() => handleTaskCreation("Training Task")} className="btn-secondary-light iso-submodal-submit-button">
                Create Task
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Active ISO Modules Modal */}
      {isModulesModalOpen && (
        <div className="iso-modal-overlay" onClick={() => { setIsModulesModalOpen(false); setSelectedModule(null); }}>
          <div className="iso-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', width: '90%' }}>
            <div className="iso-modal-header" style={{ borderBottom: '1px solid rgba(255,255,255,0.08)', paddingBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                {selectedModule && (
                  <button
                    type="button"
                    onClick={() => setSelectedModule(null)}
                    style={{ background: 'none', border: 'none', color: 'var(--cyan-light, #22d3ee)', cursor: 'pointer', fontSize: '16px', padding: '0 4px', fontWeight: 'bold' }}
                    title="Back to standards"
                  >
                    ←
                  </button>
                )}
                <h3 className="iso-submodal-title" style={{ margin: 0, fontSize: '18px' }}>
                  {selectedModule ? `${selectedModule.name} Clauses` : 'Active ISO Modules'}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => { setIsModulesModalOpen(false); setSelectedModule(null); }}
                className="iso-modal-icon-button"
                title="Close"
                style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer' }}
              >
                <X size={18} />
              </button>
            </div>

            {selectedModule ? (
              // 📜 CLAUSES LIST
              loadingClauses ? (
                <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--muted)' }}>Loading clauses...</div>
              ) : clauses.length === 0 ? (
                <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--muted)', fontSize: '13.5px' }}>
                  No clauses found for this standard.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', maxHeight: '350px', overflowY: 'auto', paddingRight: '4px' }}>
                  {clauses.map((clause, i) => (
                    <div
                      key={i}
                      style={{
                        padding: '12px',
                        borderRadius: '8px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.06)',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '6px'
                      }}
                    >
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                        <span style={{ fontWeight: 'bold', color: 'var(--cyan-light, #22d3ee)', fontSize: '14px', minWidth: '40px' }}>
                          {clause.clause_number}
                        </span>
                        <span style={{ fontWeight: '600', color: '#f8fafc', fontSize: '14px' }}>
                          {clause.title}
                        </span>
                      </div>
                      {clause.description && (
                        <p style={{ fontSize: '12.5px', color: '#94a3b8', margin: '4px 0 0 0', lineHeight: '1.4' }}>
                          {clause.description}
                        </p>
                      )}
                    </div>
                  ))}
                </div>
              ))
              : (
                // 📦 STANDARDS LIST
                loadingModules ? (
                  <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--muted)' }}>Loading active modules...</div>
                ) : activeModules.length === 0 ? (
                  <div style={{ padding: '24px 0', textAlign: 'center', color: 'var(--muted)', fontSize: '13.5px' }}>
                    No active ISO standards found. You can toggle standards under Settings &gt; ISO Standards.
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', maxHeight: '350px', overflowY: 'auto', paddingRight: '4px' }}>
                    {activeModules.map((module, i) => (
                      <div
                        key={i}
                        onClick={() => fetchClausesForModule(module)}
                        style={{
                          cursor: 'pointer',
                          padding: '12px',
                          borderRadius: '8px',
                          background: 'rgba(34, 211, 238, 0.05)',
                          border: '1px solid rgba(34, 211, 238, 0.15)',
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px',
                          transition: 'all 0.2s ease-in-out'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(34, 211, 238, 0.1)'; e.currentTarget.style.borderColor = 'rgba(34, 211, 238, 0.3)'; }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(34, 211, 238, 0.05)'; e.currentTarget.style.borderColor = 'rgba(34, 211, 238, 0.15)'; }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 'bold', color: '#f8fafc', fontSize: '14.5px' }}>{module.name}</span>
                          {module.version && <span style={{ fontSize: '11px', background: 'rgba(255,255,255,0.1)', padding: '2px 6px', borderRadius: '4px', color: '#94a3b8' }}>v{module.version}</span>}
                        </div>
                        {module.description && <span style={{ fontSize: '12.5px', color: '#94a3b8', lineHeight: '1.4' }}>{module.description}</span>}
                      </div>
                    ))}
                  </div>
                ))
            }
          </div>
        </div>
      )}

      <CARModal
        isOpen={isCarModalOpen}
        onClose={() => setIsCarModalOpen(false)}
        form={carForm}
        handleChange={handleCarChange}
        toggleNcrSelection={toggleNcrSelection}
        error={carError}
        isSubmitting={isSubmittingCar}
        onSubmit={handleSubmitCAR}
        departments={departments}
        departmentsLoading={loadingDropdowns}
        users={users}
        usersLoading={loadingDropdowns}
        allReports={[]}
      />
    </main>
  )
}

const ProgressRow = ({ label, tone, percent, icon }) => (
  <div className="progress-row iso-progress-row" style={{ display: 'flex', alignItems: 'center', width: '100%', gap: '16px' }}>
    <div className="progress-label-container iso-progress-label-container" style={{ width: '130px', flexShrink: 0 }}>
      <span className={`progress-icon progress-icon-${tone} iso-progress-icon`}>{icon}</span>
      <span className="progress-label-text iso-progress-label-text">{label}:</span>
    </div>
    <div className="progress-bar-container iso-progress-bar-container" style={{ flex: 1 }}>
      <div 
        className={`progress-bar-fill progress-fill-${tone} iso-progress-bar-fill`} 
        style={{ width: `${percent}%`, height: '100%' }}
      />
    </div>
    <span style={{ fontSize: '13px', color: '#94a3b8', minWidth: '40px', textAlign: 'right' }}>{percent}%</span>
  </div>
);

export default ISOPage;