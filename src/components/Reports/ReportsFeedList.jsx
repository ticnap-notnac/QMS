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
  canAssignReports,
  canUpdateReport,
  onApprove,
  onReject,
  onUpdate,
  onAssign
}) {
  if (isApprovalQueueMode) {
    return (
      <div className="reports-main-wrap" style={{ marginTop: '24px' }}>
        <div className="reports-details-title-wrap" style={{ marginBottom: '12px' }}>
          <h4 className="reports-details-title">Updated Reports Needing Approval</h4>
        </div>
        <div className="reports-list-stack">
          {displayedInvestigatedReports.length === 0 && (
            <div className="reports-card">
              <div className="reports-workspace">
                <span className="reports-workspace-text">No updated reports are currently waiting for approval.</span>
              </div>
            </div>
          )}
          {displayedInvestigatedReports.map((report) => (
            <InvestigatedReportCard
              key={`investigated-${report.id}`}
              report={report}
              departmentNameById={departmentNameById}
              canAssignReports={canAssignReports}
              canUpdateReport={canUpdateReport}
              onApprove={onApprove}
              onReject={onReject}
              onUpdate={onUpdate}
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
        <div className="reports-card">
          <div className="reports-workspace">
            <span className="reports-workspace-text">No closed reports found</span>
          </div>
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
            onUpdate={onUpdate}
            onAssign={onAssign}
          />
        ))}
      </>
    )
  }

  if (reports.length === 0) {
    return (
      <div className="reports-card">
        <div className="reports-workspace">
          <span className="reports-workspace-text">No open reports</span>
        </div>
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
          canAssignReports={canAssignReports}
          canUpdateReport={canUpdateReport}
          onUpdate={onUpdate}
          onAssign={onAssign}
        />
      ))}
    </>
  )
}
