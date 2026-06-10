import DCCFolderContent from '../components/DCCFolderContent.jsx'
import { useDCCLogic } from '../hooks/useDCCLogic.js'
import CARDetailsModal from '../components/Modals/CARDetailsModal.jsx'
import './PagesStyles.css'

const FOLDER_ITEMS = [
  { id: 'system_logs', label: 'System Logs' },
  { id: 'iso_modules', label: 'ISO Modules' },
  { id: 'task_reports', label: 'Task Reports' },
]

export default function DCCPage({
  userRole,
  authUserId,
}) {
  const {
    searchQuery,
    setSearchQuery,
    selectedFolder,
    openFolder,
    closeFolder,
    recentlyViewed,
    standards,
    loadingStandards,
    selectedStandard,
    clauses,
    loadingClauses,
    openStandard,
    selectedTaskFolder,
    openTaskFolder,
    closeTaskFolder,
    ncrReports,
    loadingNcr,
    carReports,
    loadingCar,
    qddrReports,
    loadingQddr,
    auditReports,
    loadingAudit,
    auditSchedules,
    loadingAuditSchedules,
    openCarDetails,
    carDetailsModalProps,
  } = useDCCLogic()

  return (
    /* 🎯 THE FIX: Changed from dcc-root to dcc-page-container to standardize page layout width constraints */
    <main className="dashboard page-root dcc-page-container">
      
      {/* 🎯 THE FIX: Changed to dcc-glass-main-card to widen the glass card frame and match the other pages */}
      <div className="dcc-glass-main-card">
        <DCCFolderContent
          // folder nav
          selectedFolder={selectedFolder}
          onCloseFolder={closeFolder}
          onOpenFolder={openFolder}
          folderItems={FOLDER_ITEMS}
          // search
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          // recently viewed
          recentlyViewed={recentlyViewed}
          // ISO
          standards={standards}
          loadingStandards={loadingStandards}
          selectedStandard={selectedStandard}
          clauses={clauses}
          loadingClauses={loadingClauses}
          onSelectStandard={openStandard}
          // Task Reports sub-folder
          selectedTaskFolder={selectedTaskFolder}
          onOpenTaskFolder={openTaskFolder}
          onCloseTaskFolder={closeTaskFolder}
          // NCR
          ncrReports={ncrReports}
          loadingNcr={loadingNcr}
          // CAR
          carReports={carReports}
          loadingCar={loadingCar}
          onSelectCar={openCarDetails}
          // QDDR
          qddrReports={qddrReports}
          loadingQddr={loadingQddr}
          // Audit
          auditReports={auditReports}
          loadingAudit={loadingAudit}
          auditSchedules={auditSchedules}
          loadingAuditSchedules={loadingAuditSchedules}
          // access control
          userRole={userRole}
        />
      </div>

      <CARDetailsModal
        {...carDetailsModalProps}
        userRole={userRole}
        authUserId={authUserId}
        readOnly={true}
      />
    </main>
  )
}