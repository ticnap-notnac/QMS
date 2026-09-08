import ReportCard from '../Cards/ReportCard.jsx'
import InvestigatedReportCard from '../Cards/InvestigatedReportCard.jsx'

export default function ReportsFeedList({
  isRecurringMode,
  isApprovalQueueMode,
  isClosedMode,
  isLoading,
  displayedInvestigatedReports,
  closedReports,
  trendClusters,
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
  onDelete,
  recurringReasonsMap
}) {
  if (isApprovalQueueMode) {
    return (
      <div className="reports-approval-wrap" style={{ marginTop: '24px' }}>
        <div className="reports-details-title-wrap" style={{ marginBottom: '12px', maxWidth: '960px', width: '100%', margin: '0 auto 12px auto' }}>
          <h4 className="reports-details-title">Updated Reports Needing Approval</h4>
        </div>
        <div className="reports-list-stack">
          {displayedInvestigatedReports.length === 0 && (
            <div className="empty-state-container">
              <span className="empty-state-text">No updated NCR reports currently waiting for approval.</span>
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
              recurringReason={recurringReasonsMap?.get(report.id)}
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
        <div className="empty-state-container">
          <span className="empty-state-text">No closed NCR reports found.</span>
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
            recurringReason={recurringReasonsMap?.get(report.id)}
          />
        ))}
      </>
    )
  }

  if (isRecurringMode) {
    if (!trendClusters || trendClusters.length === 0) {
      return (
        <div className="empty-state-container">
          <span className="empty-state-text">No recurring reports found.</span>
        </div>
      )
    }

    return (
      <div className="reports-list-stack">
        {trendClusters.map((cluster, clusterIdx) => {
          const otherReportsCount = Math.max(0, cluster.length - 1)
          const firstReport = cluster[0]
          const headerText = firstReport?.recurring_reason || `Flagged as recurring trend with ${otherReportsCount} other report(s).`

          // Pre-calculate visible reports for this cluster
          const visibleReports = cluster.map(clusterReport => {
            const openReport = reports.find(r => r.id === clusterReport.id)
            const investigatedReport = displayedInvestigatedReports.find(r => r.id === clusterReport.id)
            const closedReport = closedReports.find(r => r.id === clusterReport.id)
            return investigatedReport || closedReport || openReport || null
          }).filter(Boolean)

          // If no reports are visible in this cluster, do not render the banner
          if (visibleReports.length === 0) return null;

          return (
            <div key={`cluster-${clusterIdx}`} style={{ marginBottom: '40px' }}>
              <div className="recurring-banner-container" style={{ margin: '0 0 16px 0' }}>
                <div className="recurring-banner-header">
                  <span className="recurring-banner-badge">Recurring Issue</span>
                </div>
                {headerText}
              </div>
              <div className="reports-list-stack" style={{ gap: '16px' }}>
                {visibleReports.map(visibleReport => {
                  if (displayedInvestigatedReports.some(r => r.id === visibleReport.id)) {
                    return (
                      <InvestigatedReportCard
                        key={`investigated-${visibleReport.id}`}
                        report={visibleReport}
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
                    )
                  }
                  
                  if (closedReports.some(r => r.id === visibleReport.id)) {
                    return (
                      <ReportCard
                        key={`closed-${visibleReport.id}`}
                        report={visibleReport}
                        departmentNameById={departmentNameById}
                        userNameById={userNameById}
                        canAssignReports={canAssignReports}
                        canUpdateReport={canUpdateReport}
                        canDeleteReport={canDeleteReport}
                        onUpdate={onUpdate}
                        onAssign={onAssign}
                        onDelete={onDelete}
                      />
                    )
                  }
                  
                  return (
                    <ReportCard
                      key={`open-${visibleReport.id}`}
                      report={visibleReport}
                      departmentNameById={departmentNameById}
                      userNameById={userNameById}
                      canAssignReports={canAssignReports}
                      canUpdateReport={canUpdateReport}
                      canDeleteReport={canDeleteReport}
                      onUpdate={onUpdate}
                      onAssign={onAssign}
                      onDelete={onDelete}
                    />
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    )
  }

  if (reports.length === 0) {
    return (
      <div className="empty-state-container">
        <span className="empty-state-text">No open NCR reports found.</span>
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
          recurringReason={recurringReasonsMap?.get(report.id)}
        />
      ))}
    </>
  )
}
