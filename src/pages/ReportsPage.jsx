import React, { useState, useEffect, useRef } from 'react'
import { SlidersHorizontal, LayoutGrid, List } from 'lucide-react'
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
import { fetchRecurringTrends } from '@/services/ncrService'
import { isAdminRole } from '@/utils/roleUtils.js'
import './ReportsPage.css'

export default function ReportsPage({
  userRole,
  userDepartmentId,
  currentUserId,
  authUserId,
  userName,
  userPosition,
  setProfileTargetTab,
  userPermissions
}) {
  const logic = useReportsLogic({ currentUserId, userRole, userPermissions, authUserId, userDepartmentId })
  const normalizedRole = String(userRole || '').trim().toLowerCase()
  const rights = Array.isArray(userPermissions?.rights) ? userPermissions.rights : []
  const hasLegacyCreate = rights.includes('create_report')
  const canCreateNcr = isAdminRole(userRole) || hasLegacyCreate || rights.includes('create_ncr_report')
  const canCreateCar = isAdminRole(userRole) || rights.includes('create_car_report') || ['team leader', 'auditor'].includes(normalizedRole)
  const canCreateQddr = isAdminRole(userRole) || rights.includes('create_qddr_report')

  const canAccessCar = isAdminRole(userRole) || canCreateCar
  const canAccessQddr = isAdminRole(userRole) || canCreateQddr
  const availableTabs = ['ncr', ...(canAccessCar ? ['car'] : []), ...(canAccessQddr ? ['qddr'] : [])]

  const [carToDelete, setCarToDelete] = useState(null)
  const [qddrToDelete, setQddrToDelete] = useState(null)
  const [isDeletingCar, setIsDeletingCar] = useState(false)
  const [isDeletingQddr, setIsDeletingQddr] = useState(false)
  const [trendClusters, setTrendClusters] = useState([])
  const [isRecurringMode, setIsRecurringMode] = useState(false)
  const [isSubmitDropdownOpen, setIsSubmitDropdownOpen] = useState(false)
  const [carViewMode, setCarViewMode] = useState('feed')
  const [qddrViewMode, setQddrViewMode] = useState('feed')
  const submitDropdownRef = useRef(null)

  useEffect(() => {
    if (!isSubmitDropdownOpen) return
    const handleClickOutside = (e) => {
      if (submitDropdownRef.current && !submitDropdownRef.current.contains(e.target)) {
        setIsSubmitDropdownOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isSubmitDropdownOpen])
  
  const allRecurringReportIds = React.useMemo(() => {
    if (!trendClusters || trendClusters.length === 0) return []
    return Array.from(new Set(trendClusters.flat().map(r => r.id)))
  }, [trendClusters])

  useEffect(() => {
    if (canAccessCar) {
      fetchRecurringTrends(14)
        .then(data => setTrendClusters(data))
        .catch(err => console.error('Error fetching recurring trends:', err))
    }
  }, [canAccessCar, logic.activeTab]) // Re-fetch occasionally

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

  const clusterReportIds = isRecurringMode ? allRecurringReportIds : null

  const filteredReports = clusterReportIds 
    ? logic.reports.filter(r => clusterReportIds.includes(r.id))
    : logic.reports

  const filteredInvestigated = clusterReportIds
    ? logic.displayedInvestigatedReports.filter(r => clusterReportIds.includes(r.id))
    : logic.displayedInvestigatedReports

  const filteredClosed = clusterReportIds
    ? logic.closedReports.filter(r => clusterReportIds.includes(r.id))
    : logic.closedReports

  const handleDeleteCar = (id) => setCarToDelete(id)

  const confirmDeleteCar = async () => {
    if (!carToDelete) return
    setIsDeletingCar(true)
    try {
      await deleteCarReport(carToDelete, authUserId)
      logic.setToast({ message: 'CAR deleted successfully', type: 'success' })
      logic.refreshCarAndQddrLists()
    } catch (err) {
      logic.setToast({ message: 'This CAR could not be deleted. It may be linked to other records.', type: 'error' })
    } finally {
      setIsDeletingCar(false)
      setCarToDelete(null)
    }
  }

  const cancelDeleteCar = () => {
    if (isDeletingCar) return
    setCarToDelete(null)
  }

  const handleDeleteQddr = (id) => setQddrToDelete(id)

  const confirmDeleteQddr = async () => {
    if (!qddrToDelete) return
    setIsDeletingQddr(true)
    try {
      await deleteQddrReport(qddrToDelete, authUserId)
      logic.setToast({ message: 'QDDR deleted successfully', type: 'success' })
      logic.refreshCarAndQddrLists()
    } catch (err) {
      logic.setToast({ message: 'This QDDR could not be deleted. It may be linked to other records.', type: 'error' })
    } finally {
      setIsDeletingQddr(false)
      setQddrToDelete(null)
    }
  }

  const cancelDeleteQddr = () => {
    if (isDeletingQddr) return
    setQddrToDelete(null)
  }

  const confirmDeleteCarDialogProps = {
    isOpen: !!carToDelete,
    title: 'Delete CAR Report',
    message: 'Are you sure you want to delete this CAR report? This action cannot be fully undone.',
    confirmText: 'Delete',
    cancelText: 'Cancel',
    isDestructive: true,
    isLoading: isDeletingCar,
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
    isLoading: isDeletingQddr,
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
              <button type="button" className={`btn-quick-toggle ${logic.isApprovalQueueMode ? 'active' : ''}`} onClick={() => logic.setIsApprovalQueueMode((c) => !c)}>{logic.isApprovalQueueMode ? 'Show All' : `Needs Approval (${logic.approvalQueueReports.length})`}</button>
            )}
            <button type="button" className={`btn-quick-toggle ${logic.isClosedMode ? 'active' : ''}`} onClick={() => logic.setIsClosedMode((c) => !c)}>{logic.isClosedMode ? 'Show Open' : `Closed (${logic.activeTab === 'ncr' ? logic.closedReports.length : logic.carReports.filter(c => c.status === CAR_STATUS.CLOSED).length})`}</button>
            {logic.activeTab === 'ncr' && trendClusters.length > 0 && (
              <button 
                type="button" 
                className={`btn-quick-toggle ${isRecurringMode ? 'active recurring-active' : 'recurring-inactive'}`} 
                onClick={() => {
                  setIsRecurringMode(!isRecurringMode)
                  // Turn off other modes
                  if (!isRecurringMode) {
                    logic.setIsApprovalQueueMode(false)
                    logic.setIsClosedMode(false)
                  }
                }}
              >
                Recurring Issues ({allRecurringReportIds.length})
              </button>
            )}

          </div>
          <div className="reports-action-buttons-right">
            {((logic.activeTab === 'ncr' && canCreateNcr) ||
              (logic.activeTab === 'car' && canCreateCar) ||
              (logic.activeTab === 'qddr' && canCreateQddr)) && (
              <button 
                type="button" 
                onClick={() => {
                  if (logic.activeTab === 'ncr') logic.openCreateModal()
                  else if (logic.activeTab === 'car') logic.openCARModal()
                  else if (logic.activeTab === 'qddr') logic.openQDDRModal()
                }} 
                className="btn-gradient-primary reports-submit-primary"
                style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                title={`Submit a new ${logic.activeTab.toUpperCase()}`}
              >
                Submit {logic.activeTab.toUpperCase()}
              </button>
            )}
          </div>
        </div>

        {availableTabs.length > 1 && (
          <div className="reports-tab-nav-container" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            {/* Desktop Tabs */}
            <div className="reports-tab-nav reports-tab-nav-bar desktop-only-tabs" style={{ marginBottom: 0 }}>
              {availableTabs.map(t => {
                const tabNames = {
                  ncr: <>Non-Conformance<br/>Report</>,
                  car: <>Corrective Action<br/>Request</>,
                  qddr: <>Quality Defects / Damaged /<br/>Discrepancy Report</>
                };
                return (
                  <button 
                    key={t} 
                    type="button" 
                    className={`btn-quick-toggle reports-tab-nav-btn ${logic.activeTab === t ? 'active' : ''}`} 
                    style={{ whiteSpace: 'nowrap', lineHeight: '1.2' }}
                    onClick={() => logic.setActiveTab(t)}
                    title={t === 'ncr' ? 'View Non-Conformance Reports' : t === 'car' ? 'View Corrective Action Requests' : 'View Quality Defects / Damaged / Discrepancy Reports'}
                  >
                    {tabNames[t] || t.toUpperCase()}
                  </button>
                );
              })}
            </div>

            {/* Mobile Dropdown */}
            <div className="mobile-only-tabs">
              <select 
                className="reports-tab-mobile-dropdown"
                value={logic.activeTab}
                onChange={(e) => logic.setActiveTab(e.target.value)}
              >
                {availableTabs.map(t => {
                  const tabNamesMobile = {
                    ncr: 'NON-CONFORMANCE REPORT',
                    car: 'CORRECTIVE ACTION REQUEST',
                    qddr: 'QUALITY DEFECTS REPORT'
                  };
                  return (
                    <option key={t} value={t}>
                      {tabNamesMobile[t] || t.toUpperCase()}
                    </option>
                  );
                })}
              </select>
            </div>
            {logic.activeTab === 'car' && (
              <div className="reports-tab-nav reports-tab-nav-bar" style={{ marginBottom: 0, alignSelf: 'center' }}>
                <button
                  type="button"
                  className={`btn-quick-toggle reports-tab-nav-btn ${carViewMode === 'feed' ? 'active' : ''}`}
                  onClick={() => setCarViewMode('feed')}
                  title="Card View"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <LayoutGrid size={18} /> FEED
                </button>
                <button
                  type="button"
                  className={`btn-quick-toggle reports-tab-nav-btn ${carViewMode === 'table' ? 'active' : ''}`}
                  onClick={() => setCarViewMode('table')}
                  title="Table View"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <List size={18} /> TABLE
                </button>
              </div>
            )}
            {logic.activeTab === 'qddr' && (
              <div className="reports-tab-nav reports-tab-nav-bar" style={{ marginBottom: 0, alignSelf: 'center' }}>
                <button
                  type="button"
                  className={`btn-quick-toggle reports-tab-nav-btn ${qddrViewMode === 'feed' ? 'active' : ''}`}
                  onClick={() => setQddrViewMode('feed')}
                  title="Card View"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <LayoutGrid size={18} /> FEED
                </button>
                <button
                  type="button"
                  className={`btn-quick-toggle reports-tab-nav-btn ${qddrViewMode === 'table' ? 'active' : ''}`}
                  onClick={() => setQddrViewMode('table')}
                  title="Table View"
                  style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                >
                  <List size={18} /> TABLE
                </button>
              </div>
            )}
          </div>
        )}

        {logic.error && <div className="user-info-error">{logic.error}</div>}
        <div className="facebook-feed-layout-wrapper">
          {logic.activeTab === 'ncr' && (
            <ReportsFeedList
              isRecurringMode={isRecurringMode} isApprovalQueueMode={logic.isApprovalQueueMode} isClosedMode={logic.isClosedMode} isLoading={logic.isLoading}
              displayedInvestigatedReports={filteredInvestigated} closedReports={filteredClosed} reports={filteredReports}
              trendClusters={trendClusters}
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
              canEdit={isAdminRole(userRole) || normalizedRole === 'auditor'}
              onEditCar={logic.openEditCarModal}
              onDeleteCar={handleDeleteCar}
              viewMode={carViewMode}
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
              viewMode={qddrViewMode}
            />
          )}
        </div>
      </div>

      <FilterModal {...logic.filterModalProps} activeTab={logic.activeTab} />
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