import { SlidersHorizontal } from 'lucide-react'
import Toast from '@/components/UI/Toast'
import FilterModal from '../components/Modals/FilterModal.jsx'
import SubmissionLoadingOverlay from '../components/UI/SubmissionLoadingOverlay.jsx'
import UpdateReportModal from '../components/Modals/UpdateReportModal.jsx'
import AssignReportModal from '../components/Modals/AssignReportModal.jsx'
import CreateReportModal from '../components/Modals/CreateReportModal.jsx'
import CARModal from '../components/Modals/CARModal.jsx'
import QDDRModal from '../components/Modals/QDDRModal.jsx'
import RejectReportModal from '../components/Modals/RejectReportModal.jsx'
import PreventiveActionModal from '../components/Modals/PreventiveActionModal.jsx'
import CARDetailsModal from '../components/Modals/CARDetailsModal.jsx'
import QDDRDetailsModal from '../components/Modals/QDDRDetailsModal.jsx'
import ReportsFeedList from '../components/Reports/ReportsFeedList.jsx'
import CARReportsList from '../components/Reports/CARReportsList.jsx'
import QDDRReportsList from '../components/Reports/QDDRReportsList.jsx'
import { CAR_STATUS } from '../../shared/constants'
import { useReportsLogic } from '@/hooks/useReportsLogic'
import './ReportsPage.css'

export default function ReportsPage({ userRole, currentUserId, authUserId, userDepartmentId }) {
  const logic = useReportsLogic({ currentUserId, userRole, authUserId, userDepartmentId })
  const canAccessCar = ['admin', 'auditor'].includes(String(userRole || '').trim().toLowerCase())

  // Aggregate loading states for premium overlay spinner feedback
  const isOverlayLoading = logic.isNcrSubmitting || 
                            logic.carModalProps.isSubmitting || 
                            logic.qddrModalProps.isSubmitting || 
                            logic.updateModalProps.isSubmitting || 
                            logic.assignModalProps.isSubmitting ||
                            logic.rejectModalProps.isSubmitting ||
                            logic.preventiveActionModalProps.isSubmitting

  let overlayMessage = ''
  if (logic.isNcrSubmitting) overlayMessage = 'Submitting NCR report...'
  else if (logic.carModalProps.isSubmitting) overlayMessage = 'Submitting CAR report...'
  else if (logic.qddrModalProps.isSubmitting) overlayMessage = 'Submitting QDDR report...'
  else if (logic.updateModalProps.isSubmitting) overlayMessage = 'Updating NCR report...'
  else if (logic.assignModalProps.isSubmitting) overlayMessage = 'Assigning report...'
  else if (logic.rejectModalProps.isSubmitting) overlayMessage = 'Submitting review decision...'
  else if (logic.preventiveActionModalProps.isSubmitting) overlayMessage = 'Submitting preventive action rating...'

  const displayedCars = logic.isClosedMode
    ? logic.carReports.filter(c => String(c.status).toLowerCase() === CAR_STATUS.CLOSED.toLowerCase())
    : logic.carReports.filter(c => String(c.status).toLowerCase() !== CAR_STATUS.CLOSED.toLowerCase())

  const displayedQddrs = logic.isClosedMode
    ? logic.qddrReports.filter(q => String(q.status).toLowerCase() === 'closed')
    : logic.qddrReports.filter(q => String(q.status).toLowerCase() !== 'closed')

  return (
    <main className="dashboard page-root">
      {logic.toast && (
        <div className="reports-toast-container">
          <Toast message={logic.toast.message} type={logic.toast.type} onClose={() => logic.setToast(null)} />
        </div>
      )}
      <div className="reports-main-wrap">
        <div className="reports-action-header-row">
          <div className="reports-header-controls-left">
            <button type="button" onClick={() => logic.setIsFilterModalOpen(true)} className="btn-glass-action" title="Open Filters"><SlidersHorizontal size={18} /></button>
            {logic.activeTab === 'ncr' && logic.canAssignReports && (
              <button type="button" className="btn-quick-toggle" onClick={() => logic.setIsApprovalQueueMode((c) => !c)}>{logic.isApprovalQueueMode ? 'Show All' : `Needs Approval (${logic.approvalQueueReports.length})`}</button>
            )}
            <button type="button" className={`btn-quick-toggle ${logic.isClosedMode ? 'active' : ''}`} onClick={() => logic.setIsClosedMode((c) => !c)}>{logic.isClosedMode ? 'Show Open' : `Closed (${logic.activeTab === 'ncr' ? logic.closedReports.length : logic.carReports.filter(c => c.status === CAR_STATUS.CLOSED).length})`}</button>
            {['admin', 'auditor'].includes(String(userRole || '').trim().toLowerCase()) && (
              <select
                className="form-input reports-dept-select"
                value={logic.reportFilters.departmentId || ''}
                onChange={(e) => {
                  logic.setReportFilters(prev => ({
                    ...prev,
                    departmentId: e.target.value
                  }))
                }}
              >
                <option value="" className="reports-dept-option">All Departments</option>
                {logic.departments.map(dept => (
                  <option key={dept.id} value={dept.id} className="reports-dept-option">
                    {dept.department_name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="reports-action-buttons-right">
            {canAccessCar && (
              <button type="button" onClick={() => logic.openCARModal()} className="btn-gradient-primary reports-submit-primary">Submit CAR</button>
            )}
            <button type="button" onClick={() => logic.openQDDRModal()} className="btn-gradient-primary reports-submit-primary">Submit QDDR</button>
            <button type="button" onClick={logic.openCreateModal} className="btn-gradient-primary reports-submit-primary">Submit NCR</button>
          </div>
        </div>

        <div className="reports-tab-nav reports-tab-nav-bar">
          {['ncr', ...(canAccessCar ? ['car'] : []), 'qddr'].map(t => (
            <button key={t} type="button" className={`btn-quick-toggle reports-tab-nav-btn ${logic.activeTab === t ? 'active' : ''}`} onClick={() => logic.setActiveTab(t)}>{t} Reports</button>
          ))}
        </div>

        {logic.error && <div className="user-info-error">{logic.error}</div>}
        <div className="facebook-feed-layout-wrapper">
          {logic.activeTab === 'ncr' && (
            <ReportsFeedList
              isApprovalQueueMode={logic.isApprovalQueueMode} isClosedMode={logic.isClosedMode} isLoading={logic.isLoading}
              displayedInvestigatedReports={logic.displayedInvestigatedReports} closedReports={logic.closedReports} reports={logic.reports}
              departmentNameById={logic.departmentNameById} canAssignReports={logic.canAssignReports} canApproveReport={logic.canApproveReport} canUpdateReport={logic.canUpdateReport}
              canDeleteReport={logic.canDeleteReport} onApprove={(r) => logic.handleReviewReport(r, 'approve')} onReject={logic.openRejectModal}
              onUpdate={logic.openUpdateModal} onAssign={logic.openAssignModal} onDelete={logic.handleDeleteReport}
            />
          )}
          {logic.activeTab === 'car' && <CARReportsList carReports={displayedCars} isLoading={logic.loadingCar} onSelectCar={logic.openCarDetails} />}
          {logic.activeTab === 'qddr' && <QDDRReportsList qddrReports={displayedQddrs} isLoading={logic.loadingQddr} onSelectQddr={logic.openQddrDetails} />}
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
      <CARDetailsModal {...logic.carDetailsModalProps} />
      <QDDRDetailsModal
        isOpen={logic.isQddrDetailsModalOpen} onClose={logic.closeQddrDetails} qddr={logic.selectedQddr}
        onUpdateQddr={logic.updateQddr} users={logic.users} usersLoading={logic.usersLoading} userRole={userRole} authUserId={authUserId}
      />
      <SubmissionLoadingOverlay isOpen={isOverlayLoading} message={overlayMessage} />
    </main>
  )
}