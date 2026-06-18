import { useState, useEffect, useMemo } from 'react'
import { BookOpen, LoaderCircle, Calendar, Plus, CheckCircle, Clock } from 'lucide-react'
import SearchableDropdown from '../Forms/SearchableDropdown'

export function AuditLogsTab({
  isInsideSettings,
  logsLoading,
  logsError,
  logs,
  logsTotal,
  logsLimit,
  logsPage,
  setLogsPage,
  fetchAuditLogs
}) {
  const totalPages = Math.max(1, Math.ceil(logsTotal / logsLimit))
  return (
    <div className="tab-content" style={isInsideSettings ? { marginTop: '20px' } : {}}>
      <div className="settings-container--profile" style={{ minHeight: 'auto', padding: '24px', flexDirection: 'column' }}>
        <h3 className="settings-section-title" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <BookOpen size={20} className="icon-cyan" />
          Audit Activity Logs
        </h3>
        
        <p style={{ color: '#94a3b8', fontSize: '13.5px', marginTop: '-8px', marginBottom: '20px', lineHeight: '1.4' }}>
          Track all system actions, checklist updates, corrective actions, and policy reads logged under the Quality Management System.
        </p>

        {logsLoading && (
          <div style={{ textAlign: 'center', padding: '24px 0', color: '#64748b' }}>
            <LoaderCircle size={24} className="iso-spinner" style={{ margin: '0 auto 8px' }} />
            Loading audit activity logs...
          </div>
        )}

        {logsError && (
          <div className="iso-inline-message iso-inline-message--error" style={{ marginBottom: '16px' }}>
            {logsError}
          </div>
        )}

        {!logsLoading && !logsError && (
          <>
            <div className="iso-table-wrap">
              <table className="iso-table">
                <thead>
                  <tr>
                    <th style={{ width: '20%' }}>Timestamp</th>
                    <th style={{ width: '15%' }}>Source</th>
                    <th style={{ width: '45%' }}>Action Description / Metadata</th>
                    <th style={{ width: '20%' }}>User</th>
                  </tr>
                </thead>
                <tbody>
                  {logs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="iso-empty-state">
                        No audit activity logs found.
                      </td>
                    </tr>
                  ) : (
                    logs.map((log) => (
                      <tr key={log.id}>
                        <td style={{ fontSize: '12.5px', whiteSpace: 'nowrap' }}>
                          {new Date(log.created_at).toLocaleString()}
                        </td>
                        <td>
                          <span style={{ fontSize: '11px', background: 'rgba(34, 211, 238, 0.1)', color: '#22d3ee', padding: '2px 6px', borderRadius: '4px', fontWeight: '600', textTransform: 'uppercase' }}>
                            {log.source || 'system'}
                          </span>
                        </td>
                        <td style={{ maxWidth: 400, overflow: 'hidden', textOverflow: 'ellipsis', fontSize: '13px' }}>
                          <div style={{ fontWeight: '500', color: '#f8fafc' }}>
                            {typeof log.action === 'string' ? log.action : JSON.stringify(log.action)}
                          </div>
                          {log.details && Object.keys(log.details).length > 0 && (
                            <div style={{ fontSize: '11px', color: '#64748b', marginTop: '4px', fontFamily: 'monospace' }}>
                              {JSON.stringify(log.details)}
                            </div>
                          )}
                        </td>
                        <td style={{ fontSize: '13px', color: '#94a3b8' }}>
                          {log.user_display || log.user_auth_id || 'System'}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>

            {logsTotal > logsLimit && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '16px', marginTop: '20px' }}>
                <button
                  type="button"
                  className="sidebar-button"
                  style={{ padding: '6px 12px', fontSize: '12px' }}
                  disabled={logsPage === 0}
                  onClick={() => {
                    const newPage = logsPage - 1
                    setLogsPage(newPage)
                    fetchAuditLogs(newPage)
                  }}
                >
                  Previous
                </button>
                <span style={{ fontSize: '13px', color: '#94a3b8' }}>
                  Page {logsPage + 1} of {totalPages}
                </span>
                <button
                  type="button"
                  className="sidebar-button"
                  style={{ padding: '6px 12px', fontSize: '12px' }}
                  disabled={logsPage >= totalPages - 1}
                  onClick={() => {
                    const newPage = logsPage + 1
                    setLogsPage(newPage)
                    fetchAuditLogs(newPage)
                  }}
                >
                  Next
                </button>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  )
}

export function AuditReportsTab({
  isInsideSettings,
  completedRuns,
  loadingReports,
  reportsError,
  fetchRunDetails,
  handlePrintReport
}) {
  const avgScore = completedRuns.length > 0 
    ? Math.round(completedRuns.reduce((acc, curr) => acc + curr.score, 0) / completedRuns.length) 
    : 100
  const totalDeficiencies = completedRuns.reduce((acc, curr) => acc + curr.nonCompliantClauses, 0)

  return (
    <div className="tab-content" style={isInsideSettings ? { marginTop: '20px' } : {}}>
      <div className="settings-container--profile" style={{ minHeight: 'auto', padding: '24px', flexDirection: 'column', gap: '20px' }}>
        <div>
          <h3 className="settings-section-title" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <BookOpen size={20} className="icon-cyan" />
            Completed Audit Reports
          </h3>
          <p style={{ color: '#94a3b8', fontSize: '13.5px', marginTop: '-8px', marginBottom: '20px', lineHeight: '1.4' }}>
            View dynamic compliance score cards, read specific clause evaluations, and download print-ready records of completed quality audits.
          </p>
        </div>

        {/* Stats Summary Cards Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '16px', width: '100%', marginBottom: '12px' }}>
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Total Audits</span>
            <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#f8fafc' }}>{completedRuns.length}</span>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Average Score</span>
            <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#22d3ee' }}>{avgScore}%</span>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '8px', padding: '16px', display: 'flex', flexDirection: 'column', gap: '4px' }}>
            <span style={{ fontSize: '12px', color: '#64748b', textTransform: 'uppercase', fontWeight: 'bold' }}>Total Gaps Found</span>
            <span style={{ fontSize: '24px', fontWeight: 'bold', color: '#ef4444' }}>{totalDeficiencies}</span>
          </div>
        </div>

        {loadingReports ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: '#64748b' }}>
            <LoaderCircle size={24} className="iso-spinner" style={{ margin: '0 auto 8px' }} />
            Loading completed audit runs...
          </div>
        ) : reportsError ? (
          <div className="iso-inline-message iso-inline-message--error" style={{ width: '100%' }}>
            {reportsError}
          </div>
        ) : completedRuns.length === 0 ? (
          <div style={{ width: '100%', padding: '32px 0', textAlign: 'center', color: '#64748b', border: '1px dashed rgba(255,255,255,0.06)', borderRadius: '8px' }}>
            No completed audits found. Complete an active schedule to generate reports here!
          </div>
        ) : (
          <div className="iso-table-wrap" style={{ width: '100%' }}>
            <table className="iso-table">
              <thead>
                <tr>
                  <th style={{ width: '25%' }}>Audit Run</th>
                  <th style={{ width: '20%' }}>ISO Standard</th>
                  <th style={{ width: '20%' }}>Conducted By</th>
                  <th style={{ width: '15%' }} className="text-center">Compliance Score</th>
                  <th style={{ width: '20%' }} className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {completedRuns.map(run => (
                  <tr key={run.id}>
                    <td>
                      <strong>{run.title}</strong>
                      <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                        Completed: {new Date(run.completed_at).toLocaleDateString()}
                      </div>
                    </td>
                    <td>{run.standard_name}</td>
                    <td>{run.auditor_name}</td>
                    <td className="text-center">
                      <span 
                        style={{ 
                          fontWeight: 'bold', 
                          color: run.score >= 90 ? '#10b981' : run.score >= 70 ? '#f59e0b' : '#ef4444',
                          fontSize: '15px'
                        }}
                      >
                        {run.score}%
                      </span>
                      <div style={{ fontSize: '10px', color: '#64748b', marginTop: '2px' }}>
                        {run.compliantClauses} Compliant / {run.nonCompliantClauses} Gap
                      </div>
                    </td>
                    <td className="text-center">
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button
                          type="button"
                          className="btn-primary"
                          style={{ padding: '6px 10px', fontSize: '12px' }}
                          onClick={() => fetchRunDetails(run)}
                        >
                          Details
                        </button>
                        <button
                          type="button"
                          className="sidebar-button"
                          style={{ padding: '6px 10px', fontSize: '12px' }}
                          onClick={() => handlePrintReport(run)}
                        >
                          Print
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

export function AuditSchedulesTab({
  isInsideSettings,
  handleScheduleSubmit,
  title,
  setTitle,
  standardId,
  setStandardId,
  standards,
  scheduledDate,
  setScheduledDate,
  auditorId,
  setAuditorId,
  auditors,
  error,
  success,
  saving,
  loading,
  schedules,
  handleStartAudit,
  templateId,
  setTemplateId,
  templates
}) {
  const auditorOptions = useMemo(() => {
    return auditors.map(aud => ({
      id: aud.auth_id,
      label: `${aud.first_name} ${aud.last_name} (${aud.role_id === 1 ? 'Admin' : 'Auditor'})`
    }))
  }, [auditors])

  const [auditorSearchValue, setAuditorSearchValue] = useState('')

  const filteredTemplates = useMemo(() => {
    if (!standardId) return []
    return templates.filter(t => String(t.standard_id) === String(standardId))
  }, [templates, standardId])

  useEffect(() => {
    if (!auditorId) {
      setAuditorSearchValue('')
      return
    }
    const found = auditorOptions.find(opt => opt.id === auditorId)
    if (found) {
      setAuditorSearchValue(found.label)
    }
  }, [auditorId, auditorOptions])

  // Clear template selection if standard changes
  useEffect(() => {
    setTemplateId('')
  }, [standardId, setTemplateId])

  return (
    <div className="tab-content" style={isInsideSettings ? { marginTop: '20px' } : {}}>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '32px' }}>
        
        {/* Creation Form */}
        <div className="settings-container--profile" style={{ minHeight: 'auto', padding: '24px', flexDirection: 'column' }}>
          <h3 className="settings-section-title" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Plus size={20} className="icon-cyan" />
            Create Audit Schedule
          </h3>

          <form onSubmit={handleScheduleSubmit} className="iso-form" style={{ width: '100%' }}>
            <div className="form-row-2">
              <div className="form-group">
                <label htmlFor="audit-title">Audit Title</label>
                <input
                  id="audit-title"
                  type="text"
                  placeholder="e.g., Q2 Internal Quality Audit"
                  className="form-input"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="standard-select">ISO Standard</label>
                <select
                  id="standard-select"
                  className="form-input"
                  value={standardId}
                  onChange={(e) => setStandardId(e.target.value)}
                >
                  <option value="">Select a standard...</option>
                  {standards.map(std => (
                    <option key={std.id} value={std.id}>
                      {std.name} ({std.version})
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <label htmlFor="template-select">Checklist Template (Optional)</label>
                <select
                  id="template-select"
                  className="form-input"
                  value={templateId}
                  onChange={(e) => setTemplateId(e.target.value)}
                  disabled={!standardId}
                >
                  <option value="">Select template...</option>
                  {filteredTemplates.map(temp => (
                    <option key={temp.id} value={temp.id}>
                      {temp.title} ({temp.audit_checklist_items?.length || 0} items)
                    </option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label htmlFor="schedule-date">Scheduled Date</label>
                <input
                  id="schedule-date"
                  type="date"
                  className="form-input"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                />
              </div>
            </div>

            <div className="form-row-2">
              <div className="form-group">
                <SearchableDropdown
                  label="Assign Auditor"
                  value={auditorSearchValue}
                  onValueChange={setAuditorSearchValue}
                  options={auditorOptions}
                  placeholder="Search and select auditor..."
                  onSelectOption={(option) => {
                    setAuditorId(option.id)
                  }}
                />
              </div>
              <div className="form-group"></div>
            </div>


            {error && (
              <div className="iso-inline-message iso-inline-message--error" style={{ marginBottom: '16px' }}>
                {error}
              </div>
            )}

            {success && (
              <div className="iso-inline-message iso-inline-message--success" style={{ marginBottom: '16px' }}>
                {success}
              </div>
            )}

            <div className="iso-actions-row" style={{ marginTop: '8px' }}>
              <button type="submit" className="btn-primary" disabled={saving}>
                {saving ? (
                  <>
                    <LoaderCircle size={16} className="iso-spinner" style={{ marginRight: '8px', display: 'inline' }} />
                    Saving...
                  </>
                ) : 'Save Schedule'}
              </button>
            </div>
          </form>
        </div>

        {/* Schedules List */}
        <div className="settings-container--profile" style={{ minHeight: 'auto', padding: '24px', flexDirection: 'column' }}>
          <h3 className="settings-section-title" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Calendar size={20} className="icon-cyan" />
            Scheduled Audits
          </h3>

          <div className="iso-table-wrap">
            <table className="iso-table">
              <thead>
                <tr>
                  <th style={{ width: '25%' }}>Audit Title / Template</th>
                  <th style={{ width: '20%' }}>ISO Standard</th>
                  <th style={{ width: '20%' }}>Assigned Auditor</th>
                  <th style={{ width: '15%' }}>Date</th>
                  <th style={{ width: '10%' }} className="text-center">Status</th>
                  <th style={{ width: '10%' }} className="text-center">Action</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={6} className="iso-empty-state">
                      <LoaderCircle size={24} className="iso-spinner" style={{ margin: '0 auto 8px' }} />
                      Loading schedules...
                    </td>
                  </tr>
                ) : schedules.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="iso-empty-state">
                      No audits scheduled yet. Create one above!
                    </td>
                  </tr>
                ) : (
                  schedules.map(sched => (
                    <tr key={sched.id}>
                      <td>
                        <strong>{sched.title}</strong>
                        {sched.template_name && (
                          <div style={{ fontSize: '11px', color: '#64748b', marginTop: '2px' }}>
                            Template: {sched.template_name}
                          </div>
                        )}
                      </td>
                      <td>{sched.standard_name}</td>
                      <td>{sched.auditor_name}</td>
                      <td>{sched.scheduled_date}</td>
                      <td className="text-center">
                        <span className={`iso-status-pill ${sched.status === 'completed' ? 'is-active' : 'is-inactive'}`} style={{ display: 'inline-flex', alignItems: 'center', gap: '4px' }}>
                          {sched.status === 'completed' ? (
                            <>
                              <CheckCircle size={12} />
                              Completed
                            </>
                          ) : (
                            <>
                              <Clock size={12} />
                              Pending
                            </>
                          )}
                        </span>
                      </td>
                      <td className="text-center">
                        {sched.status !== 'completed' && (
                          <button
                            type="button"
                            className="btn-primary"
                            style={{ padding: '6px 12px', fontSize: '12px' }}
                            onClick={() => handleStartAudit(sched)}
                          >
                            Start Run
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  )
}

export function AuditTemplatesTab({
  isInsideSettings,
  templates,
  templatesLoading,
  standards,
  fetchClausesForStandard,
  handleCreateTemplate,
  handleUpdateTemplate,
  handleDeleteTemplate,
  error,
  setError,
  success,
  setSuccess,
  saving
}) {
  const [showForm, setShowForm] = useState(false)
  const [editingTemplate, setEditingTemplate] = useState(null)
  
  const [formTitle, setFormTitle] = useState('')
  const [formDescription, setFormDescription] = useState('')
  const [formStandardId, setFormStandardId] = useState('')
  const [formItems, setFormItems] = useState([])
  const [loadingClauses, setLoadingClauses] = useState(false)

  const handleStandardChange = async (stdId) => {
    setFormStandardId(stdId)
    if (!stdId) {
      setFormItems([])
      return
    }
    setLoadingClauses(true)
    try {
      const clauses = await fetchClausesForStandard(stdId)
      const items = clauses.map(clause => ({
        clause_id: clause.id,
        clause_number: clause.clause_number,
        title: clause.title,
        requirement: '',
        what_to_look_for: ''
      }))
      setFormItems(items)
    } catch (err) {
      console.error(err)
    } finally {
      setLoadingClauses(false)
    }
  }

  const handleOpenCreate = () => {
    setError('')
    setSuccess('')
    setEditingTemplate(null)
    setFormTitle('')
    setFormDescription('')
    setFormStandardId('')
    setFormItems([])
    setShowForm(true)
  }

  const handleOpenEdit = (template) => {
    setError('')
    setSuccess('')
    setEditingTemplate(template)
    setFormTitle(template.title || '')
    setFormDescription(template.description || '')
    setFormStandardId(template.standard_id || '')
    
    const items = (template.audit_checklist_items || []).map(item => ({
      clause_id: item.clause_id,
      clause_number: item.iso_clauses?.clause_number || 'N/A',
      title: item.iso_clauses?.title || 'Custom Clause',
      requirement: item.requirement || '',
      what_to_look_for: item.what_to_look_for || ''
    }))
    setFormItems(items)
    setShowForm(true)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setSuccess('')

    if (!formTitle.trim()) {
      setError('Template title is required.')
      return
    }

    const payload = {
      title: formTitle.trim(),
      description: formDescription.trim(),
      standardId: formStandardId ? Number(formStandardId) : null,
      items: formItems.map(item => ({
        clause_id: item.clause_id,
        requirement: item.requirement || '',
        what_to_look_for: item.what_to_look_for || ''
      }))
    }

    try {
      if (editingTemplate) {
        await handleUpdateTemplate(editingTemplate.id, payload)
      } else {
        await handleCreateTemplate(payload)
      }
      setShowForm(false)
    } catch (err) {
      // handled in hook
    }
  }

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this checklist template?')) return
    try {
      await handleDeleteTemplate(id)
    } catch (err) {
      // handled in hook
    }
  }

  if (showForm) {
    return (
      <div className="tab-content" style={isInsideSettings ? { marginTop: '20px' } : {}}>
        <div className="settings-container--profile" style={{ minHeight: 'auto', padding: '24px', flexDirection: 'column' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px', borderBottom: '1px solid rgba(255,255,255,0.06)', paddingBottom: '12px' }}>
            <h3 className="settings-section-title" style={{ margin: 0 }}>
              {editingTemplate ? 'Edit Checklist Template' : 'Create Checklist Template'}
            </h3>
            <button className="sidebar-button" onClick={() => setShowForm(false)} style={{ borderColor: 'rgba(255,255,255,0.1)' }}>
              Back to List
            </button>
          </div>

          <form onSubmit={handleSubmit} className="iso-form" style={{ width: '100%' }}>
            <div className="form-group">
              <label>Template Title</label>
              <input
                type="text"
                className="form-input"
                placeholder="e.g., ISO 22000 Comprehensive Audit Checklist"
                value={formTitle}
                onChange={e => setFormTitle(e.target.value)}
                required
              />
            </div>

            <div className="form-group">
              <label>Description</label>
              <textarea
                className="form-input"
                rows={3}
                placeholder="Describe the purpose or scope of this template..."
                value={formDescription}
                onChange={e => setFormDescription(e.target.value)}
                style={{ resize: 'vertical' }}
              />
            </div>

            <div className="form-group">
              <label>ISO Standard</label>
              <select
                className="form-input"
                value={formStandardId}
                onChange={e => handleStandardChange(e.target.value)}
                disabled={!!editingTemplate}
              >
                <option value="">Select standard to load clauses...</option>
                {standards.map(std => (
                  <option key={std.id} value={std.id}>
                    {std.name} ({std.version})
                  </option>
                ))}
              </select>
              {!editingTemplate && <p style={{ fontSize: '12px', color: '#64748b', marginTop: '4px' }}>Selecting standard will automatically load all active clauses below.</p>}
            </div>

            <div style={{ marginTop: '24px', marginBottom: '24px' }}>
              <h4 style={{ color: '#fff', marginBottom: '12px', fontSize: '15px' }}>Checklist Requirements & Instructions</h4>
              
              {loadingClauses ? (
                <div style={{ textAlign: 'center', padding: '24px 0', color: '#64748b' }}>
                  <LoaderCircle size={24} className="iso-spinner" style={{ margin: '0 auto 8px' }} />
                  Loading standard clauses...
                </div>
              ) : formItems.length === 0 ? (
                <div style={{ padding: '24px', textAlign: 'center', color: '#64748b', border: '1px dashed rgba(255,255,255,0.06)', borderRadius: '8px' }}>
                  Select an ISO standard above to populate the checklist clauses.
                </div>
              ) : (
                <div className="iso-table-wrap">
                  <table className="iso-table">
                    <thead>
                      <tr>
                        <th style={{ width: '15%' }}>Clause ID</th>
                        <th style={{ width: '25%' }}>Clause Title</th>
                        <th style={{ width: '30%' }}>Requirement (Custom)</th>
                        <th style={{ width: '30%' }}>What to look for and how?</th>
                      </tr>
                    </thead>
                    <tbody>
                      {formItems.map((item, index) => (
                        <tr key={item.clause_id}>
                          <td><strong>{item.clause_number}</strong></td>
                          <td style={{ fontSize: '13px' }}>{item.title}</td>
                          <td>
                            <textarea
                              className="form-input"
                              rows={2}
                              style={{ fontSize: '12.5px', padding: '6px 8px', resize: 'vertical' }}
                              placeholder="Enter specific audit requirement details..."
                              value={item.requirement}
                              onChange={e => {
                                const newItems = [...formItems]
                                newItems[index].requirement = e.target.value
                                setFormItems(newItems)
                              }}
                              required
                            />
                          </td>
                          <td>
                            <textarea
                              className="form-input"
                              rows={2}
                              style={{ fontSize: '12.5px', padding: '6px 8px', resize: 'vertical' }}
                              placeholder="Instructions on what to look for and verify..."
                              value={item.what_to_look_for}
                              onChange={e => {
                                const newItems = [...formItems]
                                newItems[index].what_to_look_for = e.target.value
                                setFormItems(newItems)
                              }}
                              required
                            />
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {error && (
              <div className="iso-inline-message iso-inline-message--error" style={{ marginBottom: '16px' }}>
                {error}
              </div>
            )}

            <div className="iso-actions-row">
              <button type="submit" className="btn-primary" disabled={saving || formItems.length === 0}>
                {saving ? 'Saving...' : 'Save Template'}
              </button>
              <button type="button" className="sidebar-button" onClick={() => setShowForm(false)}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      </div>
    )
  }

  return (
    <div className="tab-content" style={isInsideSettings ? { marginTop: '20px' } : {}}>
      <div className="settings-container--profile" style={{ minHeight: 'auto', padding: '24px', flexDirection: 'column', gap: '20px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '16px' }}>
          <div>
            <h3 className="settings-section-title" style={{ marginBottom: '4px', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <BookOpen size={20} className="icon-cyan" />
              Checklist Templates
            </h3>
            <p style={{ color: '#94a3b8', fontSize: '13.5px', margin: 0, lineHeight: '1.4' }}>
              Create reusable clause-based checklists. Auto-populate from ISO standards and customize audit guidelines.
            </p>
          </div>
          <button onClick={handleOpenCreate} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <Plus size={16} />
            Create Template
          </button>
        </div>

        {error && (
          <div className="iso-inline-message iso-inline-message--error" style={{ width: '100%', marginBottom: '8px' }}>
            {error}
          </div>
        )}
        {success && (
          <div className="iso-inline-message iso-inline-message--success" style={{ width: '100%', marginBottom: '8px' }}>
            {success}
          </div>
        )}

        {templatesLoading ? (
          <div style={{ textAlign: 'center', padding: '24px 0', color: '#64748b' }}>
            <LoaderCircle size={24} className="iso-spinner" style={{ margin: '0 auto 8px' }} />
            Loading templates...
          </div>
        ) : templates.length === 0 ? (
          <div style={{ width: '100%', padding: '32px 0', textAlign: 'center', color: '#64748b', border: '1px dashed rgba(255,255,255,0.06)', borderRadius: '8px' }}>
            No checklist templates found. Create your first template to get started!
          </div>
        ) : (
          <div className="iso-table-wrap" style={{ width: '100%' }}>
            <table className="iso-table">
              <thead>
                <tr>
                  <th style={{ width: '25%' }}>Template Title</th>
                  <th style={{ width: '35%' }}>Description</th>
                  <th style={{ width: '20%' }}>ISO Standard</th>
                  <th style={{ width: '10%' }} className="text-center">Items</th>
                  <th style={{ width: '10%' }} className="text-center">Actions</th>
                </tr>
              </thead>
              <tbody>
                {templates.map(temp => (
                  <tr key={temp.id}>
                    <td><strong>{temp.title}</strong></td>
                    <td style={{ fontSize: '13px', color: '#94a3b8' }}>{temp.description || 'No description'}</td>
                    <td>{temp.iso_standards ? `${temp.iso_standards.name} (${temp.iso_standards.version})` : 'None'}</td>
                    <td className="text-center">
                      <span style={{ fontSize: '12px', background: 'rgba(255,255,255,0.05)', padding: '2px 8px', borderRadius: '4px' }}>
                        {temp.audit_checklist_items?.length || 0}
                      </span>
                    </td>
                    <td className="text-center">
                      <div style={{ display: 'flex', gap: '8px', justifyContent: 'center' }}>
                        <button
                          type="button"
                          className="btn-primary"
                          style={{ padding: '6px 10px', fontSize: '12px' }}
                          onClick={() => handleOpenEdit(temp)}
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          className="sidebar-button"
                          style={{ padding: '6px 10px', fontSize: '12px', color: '#ef4444', borderColor: 'rgba(239, 68, 68, 0.2)' }}
                          onClick={() => handleDelete(temp.id)}
                        >
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}

