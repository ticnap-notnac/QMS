import { useState } from 'react'
import { supabase } from '@/utils/supabase'

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

function ISOPage({ userRole }) {
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
              <h2 className="metric-value iso-compliance-value">85%</h2>
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
            <ProgressRow label="Compliant" tone="success" widthClass="progress-w-85" icon={<CheckCircle2 size={14} />} />
            <ProgressRow label="Partial" tone="warning" widthClass="progress-w-10" icon={<AlertCircle size={14} />} />
            <ProgressRow label="Gap" tone="danger" widthClass="progress-w-5" icon={<HelpCircle size={14} />} />
          </div>
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
    </main>
  )
}

const ProgressRow = ({ label, tone, widthClass, icon }) => (
  <div className="progress-row iso-progress-row">
    <div className="progress-label-container iso-progress-label-container">
      <span className={`progress-icon progress-icon-${tone} iso-progress-icon`}>{icon}</span>
      <span className="progress-label-text iso-progress-label-text">{label}:</span>
    </div>
    <div className="progress-bar-container iso-progress-bar-container">
      <div className={`progress-bar-fill progress-fill-${tone} ${widthClass} iso-progress-bar-fill`} />
    </div>
  </div>
);

export default ISOPage;