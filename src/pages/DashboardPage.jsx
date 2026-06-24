import Dashboard from '../components/Dashboard.jsx'
import './DashboardPage.css'

function DashboardPage(props) {
  return (
    <main className="dashboard page-root">
      <div className="page-main">
        <Dashboard currentUserId={props.currentUserId} />
      </div>
    </main>
  )
}

export default DashboardPage;