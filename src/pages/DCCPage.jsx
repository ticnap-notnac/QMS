
import DCCFolderContent from '../components/DCCFolderContent.jsx'
import { useDCCLogic } from '../hooks/useDCCLogic.js'
import './PagesStyles.css'

const FOLDER_ITEMS = [
  { id: 'system_logs', label: 'System Logs' },
  { id: 'iso_modules', label: 'ISO Modules' },
  { id: 'task_reports', label: 'Task Reports' },
]

export default function DCCPage({
  userRole,
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
            // access control
            userRole={userRole}
          />
        </div>
      </div>
    </div>
  )
}