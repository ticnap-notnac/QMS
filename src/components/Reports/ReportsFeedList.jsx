import ReportCard from '../Cards/ReportCard.jsx'
import InvestigatedReportCard from '../Cards/InvestigatedReportCard.jsx'

export default function ReportsFeedList({
  isApprovalQueueMode,
  isClosedMode,
  isLoading,
  displayedInvestigatedReports,
  closedReports,
  reports,
  departmentNameById,
  userNameById,
  canAssignReports,
  canApproveReport,
  canUpdateReport,
  canDeleteReport,
  onApprove,
  onReject,
  onUpdate,
  onAssign,
  onDelete
}) {
  if (isApprovalQueueMode) {
    return (
      <div className="reports-approval-wrap" style={{ marginTop: '24px' }}>
        <div className="reports-details-title-wrap" style={{ marginBottom: '12px', maxWidth: '960px', width: '100%', margin: '0 auto 12px auto' }}>
          <h4 className="reports-details-title">Updated Reports Needing Approval</h4>
        </div>
        <div className="reports-list-stack">
          {displayedInvestigatedReports.length === 0 && (
            <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '80px 20px', width: '100%' }}>
              <span style={{ fontSize: '15px', color: '#64748b', fontWeight: 500 }}>No updated NCR reports currently waiting for approval.</span>
            </div>
          )}
          {displayedInvestigatedReports.map((report) => (
            <InvestigatedReportCard
              key={`investigated-${report.id}`}
              report={report}
              departmentNameById={departmentNameById}
              userNameById={userNameById}
              canAssignReports={canAssignReports}
              canApproveReport={canApproveReport}
              canUpdateReport={canUpdateReport}
              canDeleteReport={canDeleteReport}
              onApprove={onApprove}
              onReject={onReject}
              onUpdate={onUpdate}
              onDelete={onDelete}
            />
          ))}
        </div>
      </div>
    )
  }

  if (isLoading) {
    return (
      <div className="reports-card">
        <div className="glass-card-subtext">Loading reports...</div>
      </div>
    )
  }

  if (isClosedMode) {
    if (closedReports.length === 0) {
      return (
        <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '80px 20px', width: '100%' }}>
          <span style={{ fontSize: '15px', color: '#64748b', fontWeight: 500 }}>No closed NCR reports found.</span>
        </div>
      )
    }
    return (
      <>
        {closedReports.map((report) => (
          <ReportCard
            key={`closed-${report.id}`}
            report={report}
            departmentNameById={departmentNameById}
            canAssignReports={canAssignReports}
            canUpdateReport={canUpdateReport}
            canDeleteReport={canDeleteReport}
            onUpdate={onUpdate}
            onAssign={onAssign}
            onDelete={onDelete}
          />
        ))}
      </>
    )
  }

  if (reports.length === 0) {
    return (
      <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', padding: '80px 20px', width: '100%' }}>
        <span style={{ fontSize: '15px', color: '#64748b', fontWeight: 500 }}>No open NCR reports found.</span>
      </div>
    )
  }

  return (
    <>
      {reports.map((report) => (
        <ReportCard
          key={report.id}
          report={report}
          departmentNameById={departmentNameById}
          userNameById={userNameById}
          canAssignReports={canAssignReports}
          canUpdateReport={canUpdateReport}
          canDeleteReport={canDeleteReport}
          onUpdate={onUpdate}
          onAssign={onAssign}
          onDelete={onDelete}
        />
      ))}
    </>
  )
}
