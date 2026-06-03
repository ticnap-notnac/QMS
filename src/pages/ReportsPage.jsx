import { SlidersHorizontal } from 'lucide-react'

import Toast from '@/components/UI/Toast'
import FilterModal from '../components/Modals/FilterModal.jsx'
import UpdateReportModal from '../components/Modals/UpdateReportModal.jsx'
import AssignReportModal from '../components/Modals/AssignReportModal.jsx'
import CreateReportModal from '../components/Modals/CreateReportModal.jsx'
import CARModal from '../components/Modals/CARModal.jsx'
import QDDRModal from '../components/Modals/QDDRModal.jsx'
import ReportCard from '../components/Cards/ReportCard.jsx'
import InvestigatedReportCard from '../components/Cards/InvestigatedReportCard.jsx'
import RejectReportModal from '../components/Modals/RejectReportModal.jsx'
import PreventiveActionModal from '../components/Modals/PreventiveActionModal.jsx'
import { useReportsLogic } from '@/hooks/useReportsLogic'
import './PagesStyles.css'

function ReportsPage({
  userRole, userName, userPosition,
  currentUserId, authUserId,
}) {
  const logic = useReportsLogic({ currentUserId, userRole, authUserId })

  return (
    <main className="dashboard page-root">

      {logic.toast && (
        <div style={{ position: 'fixed', right: '24px', top: '88px', zIndex: 50 }}>
          <Toast message={logic.toast.message} type={logic.toast.type} onClose={() => logic.setToast(null)} />
        </div>
      )}

      <div className="reports-main-wrap">
        {/* ── Header row ─────────────────────────────────────────────── */}
        <div className="reports-action-header-row">
          <div className="reports-header-controls-left">
            <button type="button" onClick={() => logic.setIsFilterModalOpen(true)} className="btn-glass-action" title="Open Filters">
              <SlidersHorizontal size={18} />
            </button>
            {logic.canAssignReports && (
              <button type="button" className="btn-quick-toggle" onClick={() => logic.setIsApprovalQueueMode((c) => !c)}>
                {logic.isApprovalQueueMode ? 'Show All Updated' : `Needs Approval (${logic.approvalQueueReports.length})`}
              </button>
            )}
            <button type="button" className={`btn-quick-toggle ${logic.isClosedMode ? 'active' : ''}`} onClick={() => logic.setIsClosedMode((c) => !c)}>
              {logic.isClosedMode ? 'Show Open' : `Closed Reports (${logic.closedReports.length})`}
            </button>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button type="button" onClick={() => logic.openCARModal()} className="btn-gradient-primary reports-submit-primary">
              Submit CAR
            </button>
            <button type="button" onClick={() => logic.openQDDRModal()} className="btn-gradient-primary reports-submit-primary">
              Submit QDDR
            </button>
            <button type="button" onClick={logic.openCreateModal} className="btn-gradient-primary reports-submit-primary">
              Submit a Report
            </button>
          </div>
        </div>

        {logic.error && <div className="user-info-error">{logic.error}</div>}

        {/* ── 📱 CENTRALIZED SOCIAL FEED WRAPPER ── */}
        <div className="facebook-feed-layout-wrapper">

          {/* ── Approval queue ──────────────────────────────────────────── */}
          {logic.isApprovalQueueMode && (
            <div className="reports-main-wrap" style={{ marginTop: '24px' }}>
              <div className="reports-details-title-wrap" style={{ marginBottom: '12px' }}>
                <h4 className="reports-details-title">Updated Reports Needing Approval</h4>
              </div>
              <div className="reports-list-stack">
                {logic.displayedInvestigatedReports.length === 0 && (
                  <div className="reports-card">
                    <div className="reports-workspace">
                      <span className="reports-workspace-text">No updated reports are currently waiting for approval.</span>
                    </div>
                  </div>
                )}
                {logic.displayedInvestigatedReports.map((report) => (
                  <InvestigatedReportCard
                    key={`investigated-${report.id}`}
                    report={report}
                    departmentNameById={logic.departmentNameById}
                    canAssignReports={logic.canAssignReports}
                    canUpdateReport={logic.canUpdateReport}
                    onApprove={(r) => logic.handleReviewReport(r, 'approve')}
                    onReject={logic.openRejectModal}
                    onUpdate={logic.openUpdateModal}
                  />
                ))}
              </div>
            </div>
          )}

          {/* ── Main reports list ───────────────────────────────────────── */}
          {logic.isLoading ? (
            <div className="reports-card"><div className="glass-card-subtext">Loading reports...</div></div>
          ) : logic.isClosedMode ? (
            logic.closedReports.length === 0 ? (
              <div className="reports-card">
                <div className="reports-workspace"><span className="reports-workspace-text">No closed reports found</span></div>
              </div>
            ) : (
              logic.closedReports.map((report) => (
                <ReportCard
                  key={`closed-${report.id}`}
                  report={report}
                  departmentNameById={logic.departmentNameById}
                  canAssignReports={logic.canAssignReports}
                  canUpdateReport={logic.canUpdateReport}
                  onUpdate={logic.openUpdateModal}
                  onAssign={logic.openAssignModal}
                />
              ))
            )
          ) : logic.reports.length === 0 ? (
            <div className="reports-card">
              <div className="reports-workspace"><span className="reports-workspace-text">No open reports</span></div>
            </div>
          ) : (
            logic.reports.map((report) => (
              <ReportCard
                key={report.id}
                report={report}
                departmentNameById={logic.departmentNameById}
                canAssignReports={logic.canAssignReports}
                canUpdateReport={logic.canUpdateReport}
                onUpdate={logic.openUpdateModal}
                onAssign={logic.openAssignModal}
              />
            ))
          )}
        </div>
      </div>

      {/* ── Modals ──────────────────────────────────────────────────────── */}
      <FilterModal {...logic.filterModalProps} />
      <UpdateReportModal {...logic.updateModalProps} />
      <AssignReportModal {...logic.assignModalProps} />
      <CreateReportModal {...logic.createModalProps} />
      <CARModal {...logic.carModalProps} />
      <QDDRModal {...logic.qddrModalProps} />
      <RejectReportModal {...logic.rejectModalProps} />
      <PreventiveActionModal {...logic.preventiveActionModalProps} />
    </main>
  )
}

export default ReportsPage