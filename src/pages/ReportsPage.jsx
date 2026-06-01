/**
 * pages/ReportsPage.jsx
 *
 * refactor(reports): slim page shell — delegates all logic to useReportsLogic
 *
 * Responsibilities:
 *   - Compose layout from imported components
 *   - Pass props down; never own business logic
 *   - Target: ≤ 100 lines of JSX (excluding imports)
 */

import { X as CloseIcon, SlidersHorizontal, SquarePen } from 'lucide-react'
import Navbar from '../components/Navbar.jsx'
import Toast from '@/components/Toast'
import FilterModal from '../components/Modals/FilterModal.jsx'
import UpdateReportModal from '../components/Modals/UpdateReportModal.jsx'
import AssignReportModal from '../components/Modals/AssignReportModal.jsx'
import CreateReportModal from '../components/Modals/CreateReportModal.jsx'
import ReportCard from '../components/ReportCard.jsx'
import InvestigatedReportCard from '../components/InvestigatedReportCard.jsx'
import { useReportsLogic } from '@/hooks/useReportsLogic'
import './PagesStyles.css'

function ReportsPage({
  activePage, onPageChange,
  isUserMenuOpen, onToggleMenu, onLogout,
  isNotificationsOpen, onToggleNotifications,
  userRole, userName, userPosition,
  setIsAdminPanelOpen, setIsAuditToolsOpen, setProfileTargetTab,
  currentUserId, unreadNotificationCount, canViewNotifications, authUserId,
}) {
  const logic = useReportsLogic({ currentUserId, userRole, authUserId })

  return (
    <main className="dashboard page-root">
      <Navbar
        activePage={activePage} onPageChange={onPageChange}
        isUserMenuOpen={isUserMenuOpen} onToggleMenu={onToggleMenu} onLogout={onLogout}
        isNotificationsOpen={isNotificationsOpen} onToggleNotifications={onToggleNotifications}
        unreadNotificationCount={unreadNotificationCount} canViewNotifications={canViewNotifications}
        userRole={userRole} userName={userName} userPosition={userPosition}
        setIsAdminPanelOpen={setIsAdminPanelOpen} setIsAuditToolsOpen={setIsAuditToolsOpen}
        setProfileTargetTab={setProfileTargetTab}
      />

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
            <button type="button" className="btn-quick-toggle" onClick={() => console.log('Toggle CAR filter')}>CAR</button>
            <button type="button" className="btn-quick-toggle" onClick={() => console.log('Toggle QDDR filter')}>QDDR</button>
            {logic.canAssignReports && (
              <button type="button" className="btn-quick-toggle" onClick={() => logic.setIsApprovalQueueMode((c) => !c)}>
                {logic.isApprovalQueueMode ? 'Show All Updated' : `Needs Approval (${logic.approvalQueueReports.length})`}
              </button>
            )}
          </div>
          <button type="button" onClick={logic.openCreateModal} className="btn-gradient-primary reports-submit-primary">
            Submit a Report
          </button>
        </div>

        {logic.error && <div className="user-info-error">{logic.error}</div>}

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
                  onApprove={(r) => logic.handleReviewReport(r, 'approve')}
                  onReject={logic.openRejectModal}
                  onUpdate={logic.openUpdateModal}
                />
              ))}
            </div>
          </div>
        )}

        {/* ── Open reports list ───────────────────────────────────────── */}
        {logic.isLoading ? (
          <div className="reports-card"><div className="glass-card-subtext">Loading reports...</div></div>
        ) : logic.reports.length === 0 ? (
          <div className="reports-card">
            <div className="reports-workspace"><span className="reports-workspace-text">No reports yet</span></div>
          </div>
        ) : (
          logic.reports.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              departmentNameById={logic.departmentNameById}
              canAssignReports={logic.canAssignReports}
              onUpdate={logic.openUpdateModal}
              onAssign={logic.openAssignModal}
            />
          ))
        )}
      </div>

      {/* ── Modals ──────────────────────────────────────────────────────── */}
      <FilterModal
        isOpen={logic.isFilterModalOpen}
        onClose={() => logic.setIsFilterModalOpen(false)}
        onApplyFilters={logic.handleFilterApply}
        onClearFilters={logic.handleFilterClear}
      />

      <UpdateReportModal
        isOpen={logic.isUpdateModalOpen}
        onClose={logic.closeUpdateModal}
        report={logic.selectedReport}
        onSuccess={logic.handleUpdateSuccess}
      />

      <AssignReportModal
        isOpen={logic.isAssignModalOpen}
        onClose={logic.closeAssignModal}
        report={logic.selectedAssignmentReport}
        onSuccess={logic.handleAssignSuccess}
      />

      <CreateReportModal
        isOpen={logic.isModalOpen}
        onClose={logic.closeCreateModal}
        onSubmit={logic.handleSubmitReport}
        error={logic.error}
        isLoading={logic.isLoading}
        createFormState={logic.createFormState}
        locationOptions={logic.locationOptions}
        productTypeOptions={logic.productTypeOptions}
        departments={logic.departments}
        locationsLoading={logic.locationsLoading}
        productTypesLoading={logic.productTypesLoading}
        departmentsLoading={logic.departmentsLoading}
        fileInputRef={logic.fileInputRefMain}
        evidenceFile={logic.evidenceFileMain}
        setEvidenceFile={logic.setEvidenceFileMain}
        evidencePreview={logic.evidencePreviewMain}
        setEvidencePreview={logic.setEvidencePreviewMain}
        evidenceError={logic.evidenceErrorMain}
        setEvidenceError={logic.setEvidenceErrorMain}
      />

      {/* Reject modal */}
      {logic.isRejectModalOpen && logic.rejectTargetReport && (
        <div className="modal-overlay">
          <div className="modal-card modal-card--tall reports-update-card">
            <button type="button" onClick={logic.closeRejectModal} className="modal-close-button">×</button>
            <div className="modal-header-row">
              <SquarePen size={18} className="icon-teal" />
              <h3 className="reports-update-title">Reject Updated Report</h3>
            </div>
            <p className="glass-card-subtext" style={{ marginBottom: '12px' }}>
              Enter a rejection reason so the reporter can revise before resubmitting.
            </p>
            <div className="modal-form reports-form-compact">
              <div className="reports-details-box">
                <span className="reports-workspace-text">Report: {logic.rejectTargetReport.reference_no || logic.rejectTargetReport.id}</span>
              </div>
              <div>
                <label className="label-field">Rejection Reason</label>
                <textarea
                  value={logic.rejectReason}
                  onChange={(e) => logic.setRejectReason(e.target.value)}
                  className="input-field textarea-medium"
                  placeholder="Explain what needs to be fixed before resubmission..."
                />
              </div>
              <div className="reports-update-submit-row">
                <button type="button" className="btn-edit-user" onClick={logic.closeRejectModal} disabled={logic.isReviewSubmitting}>Cancel</button>
                <button
                  type="button"
                  className="btn-gradient-primary reports-update-button"
                  onClick={() => logic.handleReviewReport(logic.rejectTargetReport, 'reject', logic.rejectReason)}
                  disabled={logic.isReviewSubmitting}
                >
                  {logic.isReviewSubmitting ? 'Rejecting...' : 'Reject Report'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Preventive Action modal — unchanged, no business logic */}
      {logic.isPreventiveActionModalOpen && (
        <div className="modal-overlay">
          <div className="modal-card reports-preventive-card">
            <button onClick={() => logic.setIsPreventiveActionModalOpen(false)} className="modal-close-button"><CloseIcon size={18} /></button>
            <div className="modal-body-col">
              <div>
                <label className="label-field">Suggested Preventive Action:</label>
                <div className="workspace-placeholder workspace-placeholder--small">
                  <span className="reports-upload-text-small">Preventive Directives Content Sheet Panel</span>
                  <div className="cross-line-bg" />
                </div>
              </div>
              <div className="preventive-panel">
                <span className="label-field label-field--small">Suggested Preventive Action Rating:</span>
                <div className="preventive-options">
                  {['Excellent', 'Good', 'Ok', 'Poor', 'Very Poor'].map((rating) => (
                    <label key={rating} className="preventive-option">
                      <input
                        type="radio"
                        name="preventiveRating"
                        value={rating}
                        checked={logic.createFormState.preventiveRating === rating}
                        onChange={(e) => logic.createFormState.setPreventiveRating(e.target.value)}
                        className="radio-accent"
                      />
                      {rating}
                    </label>
                  ))}
                </div>
              </div>
              <div className="reports-preventive-submit-row">
                <button type="button" onClick={() => logic.setIsPreventiveActionModalOpen(false)} className="reports-secondary-muted">Submit</button>
              </div>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

export default ReportsPage