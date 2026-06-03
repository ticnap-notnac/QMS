import { SlidersHorizontal } from 'lucide-react'
import Toast from '@/components/UI/Toast'
import FilterModal from '../components/Modals/FilterModal.jsx'
import UpdateReportModal from '../components/Modals/UpdateReportModal.jsx'
import AssignReportModal from '../components/Modals/AssignReportModal.jsx'
import CreateReportModal from '../components/Modals/CreateReportModal.jsx'
import CARModal from '../components/Modals/CARModal.jsx'
import QDDRModal from '../components/Modals/QDDRModal.jsx'
import RejectReportModal from '../components/Modals/RejectReportModal.jsx'
import PreventiveActionModal from '../components/Modals/PreventiveActionModal.jsx'
import ReportsFeedList from '../components/Reports/ReportsFeedList.jsx'
import { useReportsLogic } from '@/hooks/useReportsLogic'
import './PagesStyles.css'

export default function ReportsPage({
  userRole, userName, userPosition,
  currentUserId, authUserId,
}) {
  const logic = useReportsLogic({ currentUserId, userRole, authUserId })

  const feedProps = {
    isApprovalQueueMode: logic.isApprovalQueueMode,
    isClosedMode: logic.isClosedMode,
    isLoading: logic.isLoading,
    displayedInvestigatedReports: logic.displayedInvestigatedReports,
    closedReports: logic.closedReports,
    reports: logic.reports,
    departmentNameById: logic.departmentNameById,
    canAssignReports: logic.canAssignReports,
    canUpdateReport: logic.canUpdateReport,
    onApprove: (r) => logic.handleReviewReport(r, 'approve'),
    onReject: logic.openRejectModal,
    onUpdate: logic.openUpdateModal,
    onAssign: logic.openAssignModal
  }

  return (
    <main className="dashboard page-root">
      {logic.toast && (
        <div style={{ position: 'fixed', right: '24px', top: '88px', zIndex: 50 }}>
          <Toast message={logic.toast.message} type={logic.toast.type} onClose={() => logic.setToast(null)} />
        </div>
      )}

      <div className="reports-main-wrap">
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

        <div className="facebook-feed-layout-wrapper">
          <ReportsFeedList {...feedProps} />
        </div>
      </div>

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