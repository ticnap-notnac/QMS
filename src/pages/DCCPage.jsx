import DCCFolderContent from '../components/DCCFolderContent.jsx'
import { useDCCLogic } from '../hooks/useDCCLogic.js'
import CARDetailsModal from '../components/Modals/CARDetailsModal.jsx'
import { AuditRunDetailsModal } from '../components/AuditTools/AuditToolsModals'
import './DCCPage.css'
import { isAdminRole } from '@/utils/roleUtils.js'

export default function DCCPage({
  userRole,
  userPermissions,
  userDepartmentId,
  userName,
  userPosition,
  setProfileTargetTab,
  authUserId
}) {
  const normRole = String(userRole || '').trim().toLowerCase()

  const FOLDER_ITEMS = [
    ...(isAdminRole(userRole) ? [{ id: 'system_logs', label: 'System Logs' }] : []),
    ...(isAdminRole(userRole) || normRole === 'auditor' ? [{ id: 'iso_modules', label: 'ISO Modules' }] : []),
    { id: 'task_reports', label: 'Task Reports' },
    { id: 'terms_policy', label: 'ISO Terms & Compliance Policy' },
  ]

  const {
    searchQuery, setSearchQuery, selectedFolder, openFolder, closeFolder, recentlyViewed, standards,
    loadingStandards, selectedStandard, clauses, loadingClauses, openStandard, selectedTaskFolder,
    closeStandard, openTaskFolder, closeTaskFolder, ncrReports, loadingNcr, carReports, loadingCar, qddrReports,
    loadingQddr, auditReports, loadingAudit, auditSchedules, loadingAuditSchedules, openCarDetails,
    carDetailsModalProps,
    isDetailsModalOpen, selectedRunDetails, setIsDetailsModalOpen,
    loadingRunDetails, runClauses, runResults, fetchRunDetails, handlePrintReport
  } = useDCCLogic()

  const auditModalProps = {
    isDetailsModalOpen, selectedRunDetails, setIsDetailsModalOpen,
    loadingRunDetails, runClauses, runResults, handlePrintReport
  }

  return (
    <main className="dcc-page-root page-root">
      <div className="dcc-main-wrapper">
        <div className="dcc-glass-main-card">
          <DCCFolderContent
            selectedFolder={selectedFolder} onCloseFolder={closeFolder} onOpenFolder={openFolder} folderItems={FOLDER_ITEMS}
            searchQuery={searchQuery} onSearchChange={setSearchQuery} recentlyViewed={recentlyViewed} standards={standards}
            loadingStandards={loadingStandards} selectedStandard={selectedStandard} clauses={clauses} loadingClauses={loadingClauses}
            onSelectStandard={openStandard} onCloseStandard={closeStandard} selectedTaskFolder={selectedTaskFolder} onOpenTaskFolder={openTaskFolder}
            onCloseTaskFolder={closeTaskFolder} ncrReports={ncrReports} loadingNcr={loadingNcr} carReports={carReports}
            loadingCar={loadingCar} onSelectCar={openCarDetails} qddrReports={qddrReports} loadingQddr={loadingQddr}
            auditReports={auditReports} loadingAudit={loadingAudit} auditSchedules={auditSchedules}
            loadingAuditSchedules={loadingAuditSchedules} userRole={userRole} userPermissions={userPermissions}
            onFetchRunDetails={fetchRunDetails}
          />
        </div>
      </div>
      <CARDetailsModal {...carDetailsModalProps} userRole={userRole} authUserId={authUserId} readOnly={true} />
      <AuditRunDetailsModal {...auditModalProps} />
    </main>
  )
}
