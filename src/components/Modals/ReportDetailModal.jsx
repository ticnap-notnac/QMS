import { formatDate } from '@/hooks/useReportsLogic'
import { useSuggestionLogic } from '@/hooks/useSuggestionLogic'

export default function ReportDetailModal({
    report,
    currentAuthId,
    canUpdateReport,
    departmentNameById,
    onClose,
}) {
    const canEdit = canUpdateReport(report)
    const deptName = departmentNameById?.get(String(report?.department_id || '')) || '—'

    const { suggestion, isSuggesting, suggestionError, loadSuggestion } = useSuggestionLogic({ report, deptName })

    return (
        <div className="modal-overlay">
            <div className="modal-card modal-card--tall reports-update-card">
                <button type="button" onClick={onClose} className="modal-close-button">×</button>

                <div className="modal-header-row">
                    <h3 className="reports-update-title">
                        {report.reference_no || `Report #${report.id}`}
                    </h3>
                </div>

                <div className="modal-form reports-form-compact">

                    <div className="reports-details-box">
                        <span className="label-field">Department</span>
                        <span className="reports-workspace-text">{deptName}</span>
                    </div>

                    <div className="reports-details-box">
                        <span className="label-field">Severity</span>
                        <span className="reports-workspace-text">{report.severity || '—'}</span>
                    </div>

                    <div className="reports-details-box">
                        <span className="label-field">Status</span>
                        <span className="reports-workspace-text">{report.status || '—'}</span>
                    </div>

                    <div className="reports-details-box">
                        <span className="label-field">Description</span>
                        <span className="reports-workspace-text">{report.description || '—'}</span>
                    </div>

                    <div className="reports-details-box">
                        <span className="label-field">Date</span>
                        <span className="reports-workspace-text">{formatDate(report.created_at)}</span>
                    </div>

                    {/* AI Corrective Action Suggestion */}
                    <div style={{ marginTop: '16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            <span className="label-field" style={{ margin: 0 }}>Corrective Action Suggestion</span>

                            {suggestion && !isSuggesting && (
                                <span style={{
                                    fontSize: '11px', padding: '2px 8px', borderRadius: '99px',
                                    background: 'rgba(34,197,94,0.15)', color: '#86efac',
                                    border: '1px solid rgba(34,197,94,0.25)'
                                }}>
                                    {Math.round((suggestion.confidence || 0) * 100)}% match
                                </span>
                            )}

                            {suggestion?.cached && (
                                <span style={{
                                    fontSize: '11px', padding: '2px 8px', borderRadius: '99px',
                                    background: 'rgba(99,102,241,0.15)', color: '#a5b4fc',
                                    border: '1px solid rgba(99,102,241,0.25)'
                                }}>
                                    cached
                                </span>
                            )}

                            {suggestion?.fromRepository && !suggestion?.cached && (
                                <span style={{
                                    fontSize: '11px', padding: '2px 8px', borderRadius: '99px',
                                    background: 'rgba(34,197,94,0.15)', color: '#86efac',
                                    border: '1px solid rgba(34,197,94,0.25)'
                                }}>
                                    from repository
                                </span>
                            )}

                            {!suggestion?.fromRepository && !suggestion?.cached && suggestion && (
                                <span style={{
                                    fontSize: '11px', padding: '2px 8px', borderRadius: '99px',
                                    background: 'rgba(245,158,11,0.15)', color: '#fde68a',
                                    border: '1px solid rgba(245,158,11,0.25)'
                                }}>
                                    AI generated
                                </span>
                            )}
                        </div>

                        {isSuggesting && (
                            <div className="reports-details-box">
                                <span className="reports-workspace-text" style={{ color: 'var(--muted)' }}>
                                    Analyzing similar cases...
                                </span>
                            </div>
                        )}

                        {suggestionError && (
                            <div className="reports-details-box">
                                <span className="reports-workspace-text" style={{ color: '#fca5a5' }}>
                                    {suggestionError}
                                </span>
                            </div>
                        )}

                        {suggestion && !isSuggesting && (
                            <div className="reports-details-box">
                                <span className="reports-workspace-text">{suggestion.text}</span>
                            </div>
                        )}

                        <button
                            type="button"
                            className="btn-edit-user"
                            onClick={loadSuggestion}
                            disabled={isSuggesting}
                            style={{ marginTop: '8px', fontSize: '12px' }}
                        >
                            {isSuggesting ? 'Analyzing...' : 'Regenerate Suggestion'}
                        </button>
                    </div>

                    {/* Recorded investigation — read only */}
                    {report.investigation_details && (
                        <div style={{ marginTop: '16px' }}>
                            <span className="label-field">Recorded Investigation</span>
                            <div className="reports-details-box" style={{ marginTop: '6px' }}>
                                <span className="reports-workspace-text">{report.investigation_details}</span>
                            </div>
                        </div>
                    )}

                </div>
            </div>
        </div>
    )
}