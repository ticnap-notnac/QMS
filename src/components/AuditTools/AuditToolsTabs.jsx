import { BookOpen, LoaderCircle, Calendar, Plus, CheckCircle, Clock } from 'lucide-react'

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
  handleStartAudit
}) {
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
                <label htmlFor="schedule-date">Scheduled Date</label>
                <input
                  id="schedule-date"
                  type="date"
                  className="form-input"
                  value={scheduledDate}
                  onChange={(e) => setScheduledDate(e.target.value)}
                />
              </div>

              <div className="form-group">
                <label htmlFor="auditor-select">Assign Auditor</label>
                <select
                  id="auditor-select"
                  className="form-input"
                  value={auditorId}
                  onChange={(e) => setAuditorId(e.target.value)}
                >
                  <option value="">Select an auditor...</option>
                  {auditors.map(aud => (
                    <option key={aud.id} value={aud.auth_id}>
                      {aud.first_name} {aud.last_name} ({aud.role_id === 1 ? 'Admin' : 'Auditor'})
                    </option>
                  ))}
                </select>
              </div>
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
                  <th style={{ width: '25%' }}>Audit Title</th>
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
                      <td><strong>{sched.title}</strong></td>
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
