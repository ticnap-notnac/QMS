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
import CARDetailsModal from '../components/Modals/CARDetailsModal.jsx'
import QDDRDetailsModal from '../components/Modals/QDDRDetailsModal.jsx'
import ReportsFeedList from '../components/Reports/ReportsFeedList.jsx'
import CARReportsList from '../components/Reports/CARReportsList.jsx'
import QDDRReportsList from '../components/Reports/QDDRReportsList.jsx'
import { CAR_STATUS } from '../../shared/constants'
import { useReportsLogic } from '@/hooks/useReportsLogic'
import './PagesStyles.css'

export default function ReportsPage({ userRole, currentUserId, authUserId, userDepartmentId }) {
  const logic = useReportsLogic({ currentUserId, userRole, authUserId, userDepartmentId })

  const displayedCars = logic.isClosedMode
    ? logic.carReports.filter(c => String(c.status).toLowerCase() === CAR_STATUS.CLOSED.toLowerCase())
    : logic.carReports.filter(c => String(c.status).toLowerCase() !== CAR_STATUS.CLOSED.toLowerCase())

  const displayedQddrs = logic.isClosedMode
    ? logic.qddrReports.filter(q => String(q.status).toLowerCase() === 'closed')
    : logic.qddrReports.filter(q => String(q.status).toLowerCase() !== 'closed')

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
            <button type="button" onClick={() => logic.setIsFilterModalOpen(true)} className="btn-glass-action" title="Open Filters"><SlidersHorizontal size={18} /></button>
            {logic.activeTab === 'ncr' && logic.canAssignReports && (
              <button type="button" className="btn-quick-toggle" onClick={() => logic.setIsApprovalQueueMode((c) => !c)}>{logic.isApprovalQueueMode ? 'Show All' : `Needs Approval (${logic.approvalQueueReports.length})`}</button>
            )}
            <button type="button" className={`btn-quick-toggle ${logic.isClosedMode ? 'active' : ''}`} onClick={() => logic.setIsClosedMode((c) => !c)}>{logic.isClosedMode ? 'Show Open' : `Closed (${logic.activeTab === 'ncr' ? logic.closedReports.length : logic.carReports.filter(c => c.status === CAR_STATUS.CLOSED).length})`}</button>
            {['admin', 'auditor'].includes(String(userRole || '').trim().toLowerCase()) && (
              <select
                className="form-input"
                style={{ 
                  width: '180px', 
                  padding: '6px 12px', 
                  fontSize: '13px', 
                  background: 'rgba(255,255,255,0.03)', 
                  color: '#fff', 
                  border: '1px solid rgba(255,255,255,0.08)',
                  borderRadius: '6px',
                  cursor: 'pointer'
                }}
                value={logic.reportFilters.departmentId || ''}
                onChange={(e) => {
                  logic.setReportFilters(prev => ({
                    ...prev,
                    departmentId: e.target.value
                  }))
                }}
              >
                <option value="" style={{ background: '#0f172a' }}>All Departments</option>
                {logic.departments.map(dept => (
                  <option key={dept.id} value={dept.id} style={{ background: '#0f172a' }}>
                    {dept.department_name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button type="button" onClick={() => logic.openCARModal()} className="btn-gradient-primary reports-submit-primary">Submit CAR</button>
            <button type="button" onClick={() => logic.openQDDRModal()} className="btn-gradient-primary reports-submit-primary">Submit QDDR</button>
            <button type="button" onClick={logic.openCreateModal} className="btn-gradient-primary reports-submit-primary">Submit NCR</button>
          </div>
        </div>

        <div className="reports-tab-nav" style={{ display: 'flex', gap: '8px', background: '#f1f5f9', border: '1px solid #e2e8f0', padding: '6px', borderRadius: '8px', marginBottom: '20px', alignSelf: 'flex-start' }}>
          {['ncr', 'car', 'qddr'].map(t => (
            <button key={t} type="button" className={`btn-quick-toggle ${logic.activeTab === t ? 'active' : ''}`} onClick={() => logic.setActiveTab(t)} style={{ padding: '8px 16px', borderRadius: '6px', border: 'none', background: logic.activeTab === t ? '#0f172a' : 'transparent', color: logic.activeTab === t ? '#ffffff' : '#64748b', fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s', textTransform: 'uppercase', fontSize: '12px' }}>{t} Reports</button>
          ))}
        </div>

        {logic.error && <div className="user-info-error">{logic.error}</div>}
        <div className="facebook-feed-layout-wrapper">
          {logic.activeTab === 'ncr' && (
            <ReportsFeedList
              isApprovalQueueMode={logic.isApprovalQueueMode} isClosedMode={logic.isClosedMode} isLoading={logic.isLoading}
              displayedInvestigatedReports={logic.displayedInvestigatedReports} closedReports={logic.closedReports} reports={logic.reports}
              departmentNameById={logic.departmentNameById} canAssignReports={logic.canAssignReports} canUpdateReport={logic.canUpdateReport}
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
    </main>
  )
}