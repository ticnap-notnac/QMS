import React, { useState, useEffect, useRef, useMemo } from 'react'
import { SlidersHorizontal, LayoutGrid, List, PanelLeftClose, PanelLeftOpen, FileCheck, AlertTriangle, ClipboardList } from 'lucide-react'
import Toast from '@/components/UI/Toast'
import ConfirmDialog from '@/components/Modals/ConfirmDialog'
import FilterModal from '../components/Modals/FilterModal.jsx'
import SubmissionLoadingOverlay from '../components/UI/SubmissionLoadingOverlay.jsx'
import CARModal from '../components/Modals/CARModal.jsx'
import QDDRModal from '../components/Modals/QDDRModal.jsx'
import CARDetailsModal from '../components/Modals/CARDetailsModal.jsx'
import QDDRDetailsModal from '../components/Modals/QDDRDetailsModal.jsx'
import CARReportsList from '../components/Reports/CARReportsList.jsx'
import QDDRReportsList from '../components/Reports/QDDRReportsList.jsx'
import MyReportsList from '../components/Reports/MyReportsList.jsx'
import { deleteCarReport, fetchCarRecurringTrends } from '../services/carService.js'
import { deleteQddrReport, fetchQddrRecurringTrends } from '../services/qddrService.js'
import { CAR_STATUS } from '../../shared/constants'
import { useReportsLogic } from '@/hooks/useReportsLogic'
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
  const logic = useReportsLogic({ currentUserId, userRole, userPermissions, authUserId, userDepartmentId, userName })
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('reports_sidebar_collapsed') === 'true'
  })

  const handleToggleSidebar = () => {
    setIsSidebarCollapsed(prev => {
      const next = !prev
      localStorage.setItem('reports_sidebar_collapsed', String(next))
      return next
    })
  }

  const tabMeta = {
    car: { label: 'Corrective Actions (CAR)', icon: FileCheck },
    qddr: { label: 'Defects & Disposal (QDDR)', icon: AlertTriangle },
    my_reports: { label: 'My Reports', icon: ClipboardList }
  }

  const normalizedRole = String(userRole || '').trim().toLowerCase()
  const hasExplicitPages = Array.isArray(userPermissions?.pages)
  const pages = hasExplicitPages ? userPermissions.pages : []
  const hasExplicitRights = Array.isArray(userPermissions?.rights)
  const rights = hasExplicitRights ? userPermissions.rights : []

  const canCreateCar = hasExplicitRights
    ? rights.includes('create_car_report') || rights.includes('create_report')
    : (isAdminRole(userRole) || ['team leader', 'auditor'].includes(normalizedRole))
  const canCreateQddr = hasExplicitRights
    ? rights.includes('create_qddr_report') || rights.includes('create_report')
    : isAdminRole(userRole)

  const canAccessCar = isAdminRole(userRole) || canCreateCar || rights.includes('view_car_reports') || rights.includes('submit_capa') || rights.includes('verify_car') || ['team leader', 'auditor'].includes(normalizedRole)
  const canAccessQddr = isAdminRole(userRole) || canCreateQddr || rights.includes('view_qddr_reports') || ['admin', 'qa officer', 'warehouse supervisor', 'warehouse executive'].includes(normalizedRole)

  const canEditDeleteReports = hasExplicitRights
    ? rights.includes('edit_delete_report')
    : (isAdminRole(userRole) || normalizedRole === 'auditor')

  const availableTabs = [
    ...(canAccessCar ? ['car'] : []),
    ...(canAccessQddr ? ['qddr'] : []),
    'my_reports'
  ]

  useEffect(() => {
    if (availableTabs.length > 0 && !availableTabs.includes(logic.activeTab)) {
      logic.setActiveTab(availableTabs[0])
    }
  }, [availableTabs, logic.activeTab, logic.setActiveTab])

  const [carToDelete, setCarToDelete] = useState(null)
  const [qddrToDelete, setQddrToDelete] = useState(null)
  const [isDeletingCar, setIsDeletingCar] = useState(false)
  const [isDeletingQddr, setIsDeletingQddr] = useState(false)
  const [trendClusters, setTrendClusters] = useState([])
  const [isRecurringMode, setIsRecurringMode] = useState(false)
  const [carViewMode, setCarViewMode] = useState('feed')
  const [qddrViewMode, setQddrViewMode] = useState('feed')
  const [myReportsViewMode, setMyReportsViewMode] = useState('feed')

  useEffect(() => {
    let isMounted = true
    if (logic.activeTab === 'car' && canAccessCar) {
      fetchCarRecurringTrends(14)
        .then(data => { if (isMounted) setTrendClusters(data || []) })
        .catch(err => console.error('Error fetching CAR recurring trends:', err))
    } else if (logic.activeTab === 'qddr' && canAccessQddr) {
      fetchQddrRecurringTrends(14)
        .then(data => { if (isMounted) setTrendClusters(data || []) })
        .catch(err => console.error('Error fetching QDDR recurring trends:', err))
    } else {
      setTrendClusters([])
    }
    return () => { isMounted = false }
  }, [canAccessCar, canAccessQddr, logic.activeTab])

  const allRecurringReportIds = useMemo(() => {
    if (!trendClusters || trendClusters.length === 0) return []
    return Array.from(new Set(trendClusters.flatMap(c => (c.reports || []).map(r => r.id))))
  }, [trendClusters])

  // Aggregate loading states for premium overlay spinner feedback
  const isOverlayLoading = logic.carModalProps.isSubmitting ||
    logic.qddrModalProps.isSubmitting

  let overlayMessage = ''
  if (logic.carModalProps.isSubmitting) overlayMessage = 'Submitting CAR report...'
  else if (logic.qddrModalProps.isSubmitting) overlayMessage = 'Submitting QDDR report...'

  const displayedCars = useMemo(() => {
    let list = logic.isClosedMode
      ? logic.carReports.filter(c => String(c.status).toLowerCase() === CAR_STATUS.CLOSED.toLowerCase())
      : logic.carReports.filter(c => String(c.status).toLowerCase() !== CAR_STATUS.CLOSED.toLowerCase())
    if (isRecurringMode && allRecurringReportIds.length > 0) {
      list = list.filter(c => allRecurringReportIds.includes(c.id))
    }
    return list
  }, [logic.isClosedMode, logic.carReports, isRecurringMode, allRecurringReportIds])

  const displayedQddrs = useMemo(() => {
    let list = logic.isClosedMode
      ? logic.qddrReports.filter(q => String(q.status).toLowerCase() === 'closed')
      : logic.qddrReports.filter(q => String(q.status).toLowerCase() !== 'closed')
    if (isRecurringMode && allRecurringReportIds.length > 0) {
      list = list.filter(q => allRecurringReportIds.includes(q.id))
    }
    return list
  }, [logic.isClosedMode, logic.qddrReports, isRecurringMode, allRecurringReportIds])

  const currentUserObj = useMemo(() => {
    return (logic.users || []).find(u =>
      (currentUserId && Number(u.id) === Number(currentUserId)) ||
      (authUserId && u.auth_id === authUserId)
    )
  }, [logic.users, currentUserId, authUserId])

  // Extract ONLY user-specific personal identifiers (strictly excluding role names)
  const userStrictNames = useMemo(() => {
    const names = new Set()
    if (currentUserObj) {
      if (currentUserObj.user_name) names.add(currentUserObj.user_name.trim().toLowerCase())
      if (currentUserObj.first_name) names.add(currentUserObj.first_name.trim().toLowerCase())
      const full = [currentUserObj.first_name, currentUserObj.last_name].filter(Boolean).join(' ').trim().toLowerCase()
      if (full) names.add(full)
    }
    if (userName) {
      const trimmed = userName.trim().toLowerCase()
      const cleanBeforeDash = trimmed.split(/\s+[—–-]\s+/)[0].trim()
      if (cleanBeforeDash) names.add(cleanBeforeDash)
    }
    return Array.from(names).filter(Boolean)
  }, [userName, currentUserObj])

  const myRawCars = useMemo(() => {
    const targetUserId = currentUserId || currentUserObj?.id
    return (logic.carReports || []).filter(car => {
      if (!car) return false
      // 1. Direct user ID match on prepared_by_audited_by
      if (targetUserId && car.prepared_by_audited_by && Number(car.prepared_by_audited_by) === Number(targetUserId)) {
        return true
      }
      // 2. Extract ONLY the username / user portion before " — " (strip the role!)
      const req = String(car.requestor || '').trim().toLowerCase()
      if (!req) return false
      const reqUserPart = req.split(/\s+[—–-]\s+/)[0].trim()
      // Strict exact match on user identity only (prevents reports matching because of shared role e.g. "Admin")
      return userStrictNames.includes(reqUserPart)
    })
  }, [logic.carReports, currentUserId, currentUserObj, userStrictNames])

  const myRawQddrs = useMemo(() => {
    const targetUserId = currentUserId || currentUserObj?.id
    return (logic.qddrReports || []).filter(q => {
      if (!q) return false
      // In QDDR, reported_by explicitly stores the user id of the person who submitted the report
      if (targetUserId && q.reported_by && Number(q.reported_by) === Number(targetUserId)) {
        return true
      }
      // Fallback: match reported_by_name strictly against user names (never role)
      if (q.reported_by_name) {
        const repName = String(q.reported_by_name).trim().toLowerCase()
        const repUserPart = repName.split(/\s+[—–-]\s+/)[0].trim()
        if (userStrictNames.includes(repUserPart)) return true
      }
      return false
    })
  }, [logic.qddrReports, currentUserId, currentUserObj, userStrictNames])

  const displayedMyCars = useMemo(() => {
    let list = logic.isClosedMode
      ? myRawCars.filter(c => String(c.status).toLowerCase() === CAR_STATUS.CLOSED.toLowerCase())
      : myRawCars.filter(c => String(c.status).toLowerCase() !== CAR_STATUS.CLOSED.toLowerCase())
    if (isRecurringMode && allRecurringReportIds.length > 0) {
      list = list.filter(c => allRecurringReportIds.includes(c.id))
    }
    return list
  }, [logic.isClosedMode, myRawCars, isRecurringMode, allRecurringReportIds])

  const displayedMyQddrs = useMemo(() => {
    let list = logic.isClosedMode
      ? myRawQddrs.filter(q => String(q.status).toLowerCase() === 'closed')
      : myRawQddrs.filter(q => String(q.status).toLowerCase() !== 'closed')
    if (isRecurringMode && allRecurringReportIds.length > 0) {
      list = list.filter(q => allRecurringReportIds.includes(q.id))
    }
    return list
  }, [logic.isClosedMode, myRawQddrs, isRecurringMode, allRecurringReportIds])

  const myClosedCount = useMemo(() => {
    const closedCars = myRawCars.filter(c => String(c.status).toLowerCase() === CAR_STATUS.CLOSED.toLowerCase()).length
    const closedQddrs = myRawQddrs.filter(q => String(q.status).toLowerCase() === 'closed').length
    return closedCars + closedQddrs
  }, [myRawCars, myRawQddrs])

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

  const canViewActiveTab =
    (logic.activeTab === 'car' && canAccessCar) ||
    (logic.activeTab === 'qddr' && canAccessQddr) ||
    logic.activeTab === 'my_reports'

  return (
    <main className="reports-page-root page-root">
      {logic.toast && (
        <div className="reports-toast-container">
          <Toast message={logic.toast.message} type={logic.toast.type} onClose={() => logic.setToast(null)} />
        </div>
      )}
      <div className={`reports-layout-container ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        {/* Desktop Sidebar */}
        {availableTabs.length > 1 && (
          <aside className={`reports-sidebar desktop-only-tabs ${isSidebarCollapsed ? 'collapsed' : ''}`}>
            <div className={`reports-sidebar-header ${isSidebarCollapsed ? 'collapsed' : ''}`}>
              {!isSidebarCollapsed && <h3 className="reports-sidebar-title">Modules</h3>}
              <button
                type="button"
                className="reports-sidebar-toggle-btn"
                onClick={handleToggleSidebar}
                title={isSidebarCollapsed ? "Expand Modules" : "Collapse Modules"}
                aria-label={isSidebarCollapsed ? "Expand Modules" : "Collapse Modules"}
              >
                {isSidebarCollapsed ? <PanelLeftOpen size={18} /> : <PanelLeftClose size={18} />}
              </button>
            </div>
            {availableTabs.map(t => {
              const meta = tabMeta[t] || { label: t.toUpperCase(), icon: FileCheck }
              const IconComp = meta.icon
              return (
                <React.Fragment key={t}>
                  {t === 'my_reports' && (
                    <div className="reports-sidebar-divider" />
                  )}
                  <button
                    type="button"
                    className={`reports-sidebar-btn ${logic.activeTab === t ? 'active' : ''}`}
                    onClick={() => {
                      logic.setActiveTab(t)
                      setIsRecurringMode(false)
                    }}
                    title={meta.label}
                    aria-label={meta.label}
                  >
                    <IconComp size={18} className="reports-sidebar-btn-icon" />
                    {!isSidebarCollapsed && (
                      <span className="reports-sidebar-btn-text">{meta.label}</span>
                    )}
                  </button>
                </React.Fragment>
              );
            })}
          </aside>
        )}

        {/* Mobile Dropdown (shown only on mobile) */}
        {availableTabs.length > 1 && (
          <div className="mobile-only-tabs">
            <select
              className="reports-tab-mobile-dropdown"
              value={logic.activeTab}
              onChange={(e) => {
                logic.setActiveTab(e.target.value)
                setIsRecurringMode(false)
              }}
            >
              {availableTabs.map(t => {
                const tabNamesMobile = {
                  car: 'Corrective Actions (CAR)',
                  qddr: 'Defects & Disposal (QDDR)',
                  my_reports: 'My Reports'
                };
                return (
                  <option key={t} value={t}>
                    {tabNamesMobile[t] || t.toUpperCase()}
                  </option>
                );
              })}
            </select>
          </div>
        )}

        <div className="reports-main-wrap">
          <div className="reports-sticky-toolbar">
            {availableTabs.length > 0 && (
              <div className="reports-action-header-row">
                <div className="reports-header-controls-left">
                  {canViewActiveTab && (
                    <>
                      <button type="button" onClick={() => logic.setIsFilterModalOpen(true)} className="btn-glass-action" title="Open Filters"><SlidersHorizontal size={18} /></button>
                      <button type="button" className={`btn-quick-toggle ${logic.isClosedMode ? 'active' : ''}`} onClick={() => logic.setIsClosedMode((c) => !c)}>
                        {logic.isClosedMode
                          ? 'Show Open'
                          : `Closed (${logic.activeTab === 'car'
                            ? logic.carReports.filter(c => String(c.status).toLowerCase() === CAR_STATUS.CLOSED.toLowerCase()).length
                            : logic.activeTab === 'qddr'
                              ? logic.qddrReports.filter(q => String(q.status).toLowerCase() === 'closed').length
                              : myClosedCount})`}
                      </button>
                      <select
                        value={logic.reportFilters?.productTypeId || ''}
                        onChange={(e) => logic.setReportFilters(prev => ({
                          ...prev,
                          productTypeId: e.target.value,
                          productMaterialName: ''
                        }))}
                        className={`reports-quick-filter-select ${logic.reportFilters?.productTypeId ? 'active' : ''}`}
                        title="Filter by Product Type"
                      >
                        <option value="">All Product Types</option>
                        {(logic.filterModalProps?.productTypes || []).map((pt) => (
                          <option key={pt.id} value={String(pt.id)}>{pt.product_type_name}</option>
                        ))}
                      </select>
                      <select
                        value={logic.reportFilters?.productMaterialName || ''}
                        onChange={(e) => logic.setReportFilters(prev => ({
                          ...prev,
                          productMaterialName: e.target.value
                        }))}
                        className={`reports-quick-filter-select ${logic.reportFilters?.productMaterialName ? 'active' : ''}`}
                        title="Filter by Product / Material"
                      >
                        <option value="">All Products / Materials</option>
                        {(() => {
                          const pts = logic.filterModalProps?.productTypes || []
                          const prods = logic.filterModalProps?.products || []
                          const selectedPt = pts.find(pt => String(pt.id) === String(logic.reportFilters?.productTypeId))
                          const list = (logic.reportFilters?.productTypeId && selectedPt && Array.isArray(selectedPt.products))
                            ? selectedPt.products
                            : prods
                          return list.map((p) => (
                            <option key={p.id} value={p.product_name}>{p.product_name}</option>
                          ))
                        })()}
                      </select>
                      {(logic.reportFilters?.productTypeId || logic.reportFilters?.productMaterialName) && (
                        <button
                          type="button"
                          onClick={() => logic.setReportFilters(prev => ({
                            ...prev,
                            productTypeId: '',
                            productMaterialName: ''
                          }))}
                          className="reports-quick-filter-clear-btn"
                          title="Clear product filters"
                        >
                          Clear
                        </button>
                      )}
                      {trendClusters.length > 0 && (
                        <button
                          type="button"
                          className={`btn-quick-toggle ${isRecurringMode ? 'active recurring-active' : 'recurring-inactive'}`}
                          onClick={() => {
                            setIsRecurringMode(!isRecurringMode)
                            if (!isRecurringMode) {
                              logic.setIsClosedMode(false)
                            }
                          }}
                        >
                          Recurring Trends ({allRecurringReportIds.length})
                        </button>
                      )}
                    </>
                  )}
                </div>
                <div className="reports-action-buttons-right">
                  {logic.activeTab === 'car' && canCreateCar && (
                    <button
                      type="button"
                      onClick={logic.openCARModal}
                      className="btn-gradient-primary reports-submit-primary"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                      title="Submit a new CAR"
                    >
                      + Submit CAR
                    </button>
                  )}
                  {logic.activeTab === 'qddr' && canCreateQddr && (
                    <button
                      type="button"
                      onClick={logic.openQDDRModal}
                      className="btn-gradient-primary reports-submit-primary"
                      style={{ display: 'inline-flex', alignItems: 'center', gap: '8px' }}
                      title="Submit a new QDDR"
                    >
                      + Submit QDDR
                    </button>
                  )}
                </div>
              </div>
            )}

            {availableTabs.length > 0 && canViewActiveTab && (
              <div className="reports-tab-nav-container">
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
                {logic.activeTab === 'my_reports' && (
                  <div className="reports-tab-nav reports-tab-nav-bar" style={{ marginBottom: 0, alignSelf: 'center' }}>
                    <button
                      type="button"
                      className={`btn-quick-toggle reports-tab-nav-btn ${myReportsViewMode === 'feed' ? 'active' : ''}`}
                      onClick={() => setMyReportsViewMode('feed')}
                      title="Card View"
                      style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                      <LayoutGrid size={18} /> FEED
                    </button>
                    <button
                      type="button"
                      className={`btn-quick-toggle reports-tab-nav-btn ${myReportsViewMode === 'table' ? 'active' : ''}`}
                      onClick={() => setMyReportsViewMode('table')}
                      title="Table View"
                      style={{ display: 'flex', alignItems: 'center', gap: '8px' }}
                    >
                      <List size={18} /> TABLE
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>

          {logic.error && <div className="user-info-error">{logic.error}</div>}
          <div className="facebook-feed-layout-wrapper">
            {logic.activeTab === 'car' && canAccessCar && (
              <CARReportsList
                carReports={displayedCars}
                isLoading={logic.loadingCar}
                onSelectCar={logic.openCarDetails}
                canEdit={canEditDeleteReports}
                onEditCar={logic.openEditCarModal}
                onDeleteCar={handleDeleteCar}
                onRateCar={logic.handleRateCar}
                viewMode={carViewMode}
                newlySubmittedId={logic.newlySubmittedReport?.type === 'car' ? logic.newlySubmittedReport?.id : null}
              />
            )}
            {logic.activeTab === 'qddr' && canAccessQddr && (
              <QDDRReportsList
                qddrReports={displayedQddrs}
                isLoading={logic.loadingQddr}
                onSelectQddr={logic.openQddrDetails}
                canEdit={canEditDeleteReports}
                onEditQddr={logic.openEditQddrModal}
                onDeleteQddr={handleDeleteQddr}
                onRateQddr={logic.handleRateQddr}
                viewMode={qddrViewMode}
                newlySubmittedId={logic.newlySubmittedReport?.type === 'qddr' ? logic.newlySubmittedReport?.id : null}
              />
            )}
            {logic.activeTab === 'my_reports' && (
              <MyReportsList
                carReports={displayedMyCars}
                qddrReports={displayedMyQddrs}
                isLoading={logic.loadingCar || logic.loadingQddr}
                onSelectCar={logic.openCarDetails}
                onSelectQddr={logic.openQddrDetails}
                canEdit={canEditDeleteReports}
                onEditCar={logic.openEditCarModal}
                onEditQddr={logic.openEditQddrModal}
                onDeleteCar={handleDeleteCar}
                onDeleteQddr={handleDeleteQddr}
                onRateCar={logic.handleRateCar}
                onRateQddr={logic.handleRateQddr}
                viewMode={myReportsViewMode}
                newlySubmittedReport={logic.newlySubmittedReport}
              />
            )}
          </div>
        </div>
      </div>

      <FilterModal {...logic.filterModalProps} activeTab={logic.activeTab} />
      <CARModal {...logic.carModalProps} />
      <QDDRModal {...logic.qddrModalProps} />
      <CARDetailsModal {...logic.carDetailsModalProps} />
      <QDDRDetailsModal
        isOpen={logic.isQddrDetailsModalOpen}
        onClose={logic.closeQddrDetails}
        qddr={logic.selectedQddr}
        onUpdateQddr={logic.updateQddr}
        onRateQddr={logic.handleRateQddr}
        users={logic.users}
        usersLoading={logic.usersLoading}
        userRole={userRole}
        userPermissions={userPermissions}
        authUserId={authUserId}
      />
      <ConfirmDialog {...confirmDeleteCarDialogProps} />
      <ConfirmDialog {...confirmDeleteQddrDialogProps} />
      <SubmissionLoadingOverlay isOpen={isOverlayLoading} message={overlayMessage} />
    </main>
  )
}
