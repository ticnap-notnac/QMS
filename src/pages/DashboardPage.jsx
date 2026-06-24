import Dashboard from '../components/Dashboard.jsx'
import './DashboardPage.css'

function DashboardPage(props) {
  return (
    <main className="dashboard page-root">
      <div className="page-main">
        <Dashboard 
          currentUserId={props.currentUserId}
          userRole={props.userRole}
          userDepartmentId={props.userDepartmentId}
        />
      </div>
    </main>
  )
}

export default DashboardPage;