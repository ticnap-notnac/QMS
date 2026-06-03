
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
    selectedCar,
    isCarDetailsModalOpen,
    openCarDetails,
    closeCarDetails,
    submitCapa,
    verifyCar,
  } = useDCCLogic()

  return (
    <div className="dcc-root">
      <div className="dcc-main-wrapper">
        <div className="glass-card-dcc">
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
      </div>

      <CARDetailsModal
        isOpen={isCarDetailsModalOpen}
        onClose={closeCarDetails}
        car={selectedCar}
        onSubmitCapa={submitCapa}
        onVerify={verifyCar}
        userRole={userRole}
        authUserId={authUserId}
      />
    </div>
  )
}

