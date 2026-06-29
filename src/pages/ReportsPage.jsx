import { useState } from 'react'
import { SlidersHorizontal } from 'lucide-react'
import Toast from '@/components/UI/Toast'
import ConfirmDialog from '@/components/Modals/ConfirmDialog'
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
import { deleteCarReport } from '../services/carService.js'
import { deleteQddrReport } from '../services/qddrService.js'
import { CAR_STATUS } from '../../shared/constants'
import { useReportsLogic } from '@/hooks/useReportsLogic'
import './ReportsPage.css'

export default function ReportsPage({ userRole, currentUserId, authUserId, userDepartmentId }) {
  const logic = useReportsLogic({ currentUserId, userRole, authUserId, userDepartmentId })
  const canAccessCar = ['admin', 'auditor'].includes(String(userRole || '').trim().toLowerCase())
  const canAccessQddr = String(userRole || '').trim().toLowerCase() !== 'warehouse staff'
  const availableTabs = ['ncr', ...(canAccessCar ? ['car'] : []), ...(canAccessQddr ? ['qddr'] : [])]

  const [carToDelete, setCarToDelete] = useState(null)
  const [qddrToDelete, setQddrToDelete] = useState(null)

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

  const handleDeleteCar = (id) => setCarToDelete(id)

  const confirmDeleteCar = async () => {
    if (!carToDelete) return
    try {
      await deleteCarReport(carToDelete, authUserId)
      logic.setToast({ message: 'CAR deleted successfully', type: 'success' })
      logic.refreshCarAndQddrLists()
    } catch (err) {
      logic.setToast({ message: 'This CAR could not be deleted. It may be linked to other records.', type: 'error' })
    } finally {
      setCarToDelete(null)
    }
  }

  const cancelDeleteCar = () => setCarToDelete(null)

  const handleDeleteQddr = (id) => setQddrToDelete(id)

  const confirmDeleteQddr = async () => {
    if (!qddrToDelete) return
    try {
      await deleteQddrReport(qddrToDelete, authUserId)
      logic.setToast({ message: 'QDDR deleted successfully', type: 'success' })
      logic.refreshCarAndQddrLists()
    } catch (err) {
      logic.setToast({ message: 'This QDDR could not be deleted. It may be linked to other records.', type: 'error' })
    } finally {
      setQddrToDelete(null)
    }
  }

  const cancelDeleteQddr = () => setQddrToDelete(null)

  const confirmDeleteCarDialogProps = {
    isOpen: !!carToDelete,
    title: 'Delete CAR Report',
    message: 'Are you sure you want to delete this CAR report? This action cannot be fully undone.',
    confirmText: 'Delete',
    cancelText: 'Cancel',
    isDestructive: true,
    onConfirm: confirmDeleteCar,
    onCancel: cancelDeleteCar,
  }

  const confirmDeleteQddrDialogProps = {
    isOpen: !!qddrToDelete,
    title: 'Delete QDDR Report',
    message: 'Are you sure you want to delete this QDDR report? This action cannot be fully undone.',
    confirmText: 'Delete',
    cancelText: 'Cancel',
    isDestructive: true,
    onConfirm: confirmDeleteQddr,
    onCancel: cancelDeleteQddr,
  }

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
                value={logic.reportFilters?.departmentId || ''}
                onChange={(e) => {
                  logic.setReportFilters(prev => ({
                    ...prev,
                    departmentId: e.target.value
                  }))
                }}
              >
                <option value="" className="reports-dept-option">All Departments</option>
                {logic.departments?.map(dept => (
                  <option key={dept.id} value={dept.id} className="reports-dept-option">
                    {dept.department_name}
                  </option>
                ))}
              </select>
            )}
          </div>
          <div className="reports-action-buttons-right">
            {canAccessCar && (
              <button 
                type="button" 
                onClick={() => logic.openCARModal()} 
                className="btn-gradient-primary reports-submit-primary"
                title="Submit Corrective Action Request (CAR) - Request corrective actions for identified issues or system non-conformances."
              >
                Submit CAR
              </button>
            )}
            {canAccessQddr && (
              <button 
                type="button" 
                onClick={() => logic.openQDDRModal()} 
                className="btn-gradient-primary reports-submit-primary"
                title="Submit Quality Defect & Disposal Report (QDDR) - Document product defects and handle product disposal processes."
              >
                Submit QDDR
              </button>
            )}
            <button 
              type="button" 
              onClick={logic.openCreateModal} 
              className="btn-gradient-primary reports-submit-primary"
              title="Submit Non-Conformance Report (NCR) - Record occurrences of processes, materials, or services that fail to meet specifications."
            >
              Submit NCR
            </button>
          </div>
        </div>

        {availableTabs.length > 1 && (
          <div className="reports-tab-nav reports-tab-nav-bar">
            {availableTabs.map(t => (
              <button key={t} type="button" className={`btn-quick-toggle reports-tab-nav-btn ${logic.activeTab === t ? 'active' : ''}`} onClick={() => logic.setActiveTab(t)}>{t.toUpperCase()} Reports</button>
            ))}
          </div>
        )}

        {logic.error && <div className="user-info-error">{logic.error}</div>}
        <div className="facebook-feed-layout-wrapper">
          {logic.activeTab === 'ncr' && (
            <ReportsFeedList
              isApprovalQueueMode={logic.isApprovalQueueMode} isClosedMode={logic.isClosedMode} isLoading={logic.isLoading}
              displayedInvestigatedReports={logic.displayedInvestigatedReports} closedReports={logic.closedReports} reports={logic.reports}
              departmentNameById={logic.departmentNameById} userNameById={logic.userNameById} canAssignReports={logic.canAssignReports} canApproveReport={logic.canApproveReport} canUpdateReport={logic.canUpdateReport}
              canDeleteReport={logic.canDeleteReport} onApprove={(r) => logic.handleReviewReport(r, 'approve')} onReject={logic.openRejectModal}
              onUpdate={logic.openUpdateModal} onAssign={logic.openAssignModal} onDelete={logic.handleDeleteReport}
            />
          )}
          {logic.activeTab === 'car' && (
            <CARReportsList 
              carReports={displayedCars} 
              isLoading={logic.loadingCar} 
              onSelectCar={logic.openCarDetails} 
              canEdit={canAccessCar}
              onEditCar={logic.openEditCarModal}
              onDeleteCar={handleDeleteCar}
            />
          )}
          {logic.activeTab === 'qddr' && (
            <QDDRReportsList 
              qddrReports={displayedQddrs} 
              isLoading={logic.loadingQddr} 
              onSelectQddr={logic.openQddrDetails} 
              canEdit={canAccessCar}
              onEditQddr={logic.openEditQddrModal}
              onDeleteQddr={handleDeleteQddr}
            />
          )}
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
      <ConfirmDialog {...logic.confirmDeleteDialogProps} />
      <ConfirmDialog {...confirmDeleteCarDialogProps} />
      <ConfirmDialog {...confirmDeleteQddrDialogProps} />
      <SubmissionLoadingOverlay isOpen={isOverlayLoading} message={overlayMessage} />
    </main>
  )
}