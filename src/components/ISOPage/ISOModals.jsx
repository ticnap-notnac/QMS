import { X, ClipboardCheck, AlertTriangle, FileText, GraduationCap } from 'lucide-react'

export function ISOModulesModal({
  isOpen,
  onClose,
  selectedModule,
  setSelectedModule,
  loadingClauses,
  clauses,
  loadingModules,
  activeModules,
  fetchClausesForModule
}) {
  if (!isOpen) return null
  return (
    <div className="iso-modal-overlay" onClick={onClose}>
      <div className="iso-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', width: '90%' }}>
        <div className="iso-modal-header" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {selectedModule && (
              <button
                type="button"
                onClick={() => setSelectedModule(null)}
                style={{ background: 'none', border: 'none', color: '#0891b2', cursor: 'pointer', fontSize: '16px', padding: '0 4px', fontWeight: 'bold' }}
                title="Back to standards"
              >
                ←
              </button>
            )}
            <h3 className="iso-submodal-title" style={{ margin: 0, fontSize: '18px', color: '#0f172a' }}>
              {selectedModule ? `${selectedModule.name} Clauses` : 'Active ISO Modules'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="iso-modal-icon-button"
            title="Close"
            style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        {selectedModule ? (
          loadingClauses ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: '#64748b' }}>Loading clauses...</div>
          ) : clauses.length === 0 ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: '#64748b', fontSize: '13.5px' }}>
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
                    background: '#f8fafc',
                    border: '1px solid #e2e8f0',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '6px'
                  }}
                >
                  <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                    <span style={{ fontWeight: 'bold', color: '#0891b2', fontSize: '14px', minWidth: '40px' }}>
                      {clause.clause_number}
                    </span>
                    <span style={{ fontWeight: '600', color: '#0f172a', fontSize: '14px' }}>
                      {clause.title}
                    </span>
                  </div>
                  {clause.description && (
                    <p style={{ fontSize: '12.5px', color: '#475569', margin: '4px 0 0 0', lineHeight: '1.4' }}>
                      {clause.description}
                    </p>
                  )}
                </div>
              ))}
            </div>
          )
        ) : (
          loadingModules ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: '#64748b' }}>Loading active modules...</div>
          ) : activeModules.length === 0 ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: '#64748b', fontSize: '13.5px' }}>
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
                    background: 'rgba(8, 145, 178, 0.05)',
                    border: '1px solid rgba(8, 145, 178, 0.15)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '4px',
                    transition: 'all 0.2s ease-in-out'
                  }}
                  onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(8, 145, 178, 0.1)'; e.currentTarget.style.borderColor = 'rgba(8, 145, 178, 0.3)'; }}
                  onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(8, 145, 178, 0.05)'; e.currentTarget.style.borderColor = 'rgba(8, 145, 178, 0.15)'; }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span style={{ fontWeight: 'bold', color: '#0f172a', fontSize: '14.5px' }}>{module.name}</span>
                    {module.version && <span style={{ fontSize: '11px', background: 'rgba(15, 23, 42, 0.06)', padding: '2px 6px', borderRadius: '4px', color: '#475569' }}>v{module.version}</span>}
                  </div>
                  {module.description && <span style={{ fontSize: '12.5px', color: '#475569', lineHeight: '1.4' }}>{module.description}</span>}
                </div>
              ))}
            </div>
          )
        )}
      </div>
    </div>
  )
}

export function ISOTaskSelectionModal({
  isOpen,
  onClose,
  openAuditTask,
  openCapaTask,
  openDocumentTask,
  openTrainingTask
}) {
  if (!isOpen) return null
  return (
    <div className="iso-modal-overlay">
      <div className="iso-modal-card">
        <div className="iso-modal-header">
          <button type="button" onClick={onClose} className="iso-modal-icon-button" title="Go back">
            <span className="iso-back-arrow">←</span>
          </button>
          <button type="button" onClick={onClose} className="iso-modal-icon-button" title="Close window">
            <X size={18} />
          </button>
        </div>
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
  )
}

export function ISOSubTaskModal({
  isOpen,
  onClose,
  title,
  canvasText,
  onSubmit
}) {
  if (!isOpen) return null
  return (
    <div className="iso-modal-overlay">
      <div className="iso-modal-card">
        <button onClick={onClose} className="iso-modal-close-absolute" aria-label="Close window">
          <X size={18} />
        </button>
        <h3 className="iso-submodal-title">{title}</h3>
        <div className="workspace-placeholder iso-submodal-canvas">
          <span className="placeholder-text iso-graph-placeholder-text">{canvasText}</span>
        </div>
        <div className="iso-submodal-submit-row">
          <button onClick={onSubmit} className="btn-secondary-light iso-submodal-submit-button">
            Create Task
          </button>
        </div>
      </div>
    </div>
  )
}

export function ISOTemplatesModal({
  isOpen,
  onClose,
  templates,
  loadingTemplates,
  selectedTemplate,
  setSelectedTemplate
}) {
  if (!isOpen) return null

  return (
    <div className="iso-modal-overlay" onClick={onClose}>
      <div className="iso-modal-card" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', width: '90%' }}>
        <div className="iso-modal-header" style={{ borderBottom: '1px solid #e2e8f0', paddingBottom: '12px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            {selectedTemplate && (
              <button
                type="button"
                onClick={() => setSelectedTemplate(null)}
                style={{ background: 'none', border: 'none', color: '#0891b2', cursor: 'pointer', fontSize: '16px', padding: '0 4px', fontWeight: 'bold' }}
                title="Back to templates list"
              >
                ←
              </button>
            )}
            <h3 className="iso-submodal-title" style={{ margin: 0, fontSize: '18px', color: '#0f172a' }}>
              {selectedTemplate ? selectedTemplate.title : 'ISO Audit Templates'}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="iso-modal-icon-button"
            title="Close"
            style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
          >
            <X size={18} />
          </button>
        </div>

        <div style={{ maxHeight: '400px', overflowY: 'auto', paddingRight: '4px' }}>
          {loadingTemplates ? (
            <div style={{ padding: '24px 0', textAlign: 'center', color: '#64748b' }}>Loading templates...</div>
          ) : !selectedTemplate ? (
            templates.length === 0 ? (
              <div style={{ padding: '24px 0', textAlign: 'center', color: '#64748b', fontSize: '14px' }}>
                No templates available.
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                {templates.map((tpl) => (
                  <div
                    key={tpl.id}
                    onClick={() => setSelectedTemplate(tpl)}
                    style={{
                      padding: '16px',
                      borderRadius: '8px',
                      background: '#f8fafc',
                      border: '1px solid #e2e8f0',
                      cursor: 'pointer',
                      transition: 'border-color 0.2s ease, background 0.2s ease'
                    }}
                    onMouseEnter={(e) => { e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.background = '#f1f5f9' }}
                    onMouseLeave={(e) => { e.currentTarget.style.borderColor = '#e2e8f0'; e.currentTarget.style.background = '#f8fafc' }}
                  >
                    <div style={{ fontWeight: '600', color: '#0f172a', marginBottom: '4px' }}>{tpl.title}</div>
                    <div style={{ fontSize: '13px', color: '#64748b' }}>{tpl.description}</div>
                    {tpl.iso_standards && (
                      <div style={{ marginTop: '8px', fontSize: '12px', fontWeight: '500', color: '#0ea5e9', display: 'inline-block', padding: '2px 8px', background: '#e0f2fe', borderRadius: '12px' }}>
                        {tpl.iso_standards.name} ({tpl.iso_standards.version})
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )
          ) : (
            <div>
              {(!selectedTemplate.audit_checklist_items || selectedTemplate.audit_checklist_items.length === 0) ? (
                <div style={{ padding: '24px 0', textAlign: 'center', color: '#64748b', fontSize: '14px' }}>
                  No checklist items found for this template.
                </div>
              ) : (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {selectedTemplate.audit_checklist_items.map((item, idx) => (
                    <div key={item.id} style={{ padding: '12px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '6px' }}>
                      {item.iso_clauses && (
                        <div style={{ fontSize: '12px', fontWeight: '600', color: '#0891b2', marginBottom: '4px' }}>
                          Clause {item.iso_clauses.clause_number}: {item.iso_clauses.title}
                        </div>
                      )}
                      <div style={{ fontSize: '14px', fontWeight: '500', color: '#0f172a', marginBottom: '6px' }}>
                        {item.requirement}
                      </div>
                      {item.what_to_look_for && (
                        <div style={{ fontSize: '13px', color: '#64748b', background: '#ffffff', padding: '8px', borderRadius: '4px', borderLeft: '3px solid #cbd5e1' }}>
                          <span style={{ fontWeight: '600', display: 'block', marginBottom: '2px', fontSize: '12px' }}>What to look for:</span>
                          {item.what_to_look_for}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
