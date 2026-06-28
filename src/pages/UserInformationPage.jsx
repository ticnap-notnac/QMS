import { useNavigate } from 'react-router-dom'
import SettingsNavbar from '@/components/Navbars/SettingsNavbar'
import useUserInformationPageLogic from '@/hooks/useUserInformationPageLogic'
import ProfileCard from '@/components/Cards/ProfileCard'
import './SettingsPage.css'

export default function UserInformationPage(props) {
  const navigate = useNavigate()
  const {
    userRole,
    userPosition,
    authUserId,
    profileTargetTab = 'User Information',
  } = props

  const { userProfile, loading, error, activeTab, setActiveTab } =
    useUserInformationPageLogic({ authUserId, profileTargetTab })

  if (loading) {
    return (
      <div className="page-root">
        <div className="page-main-centered">Loading...</div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="page-root">
        <div className="page-main-centered">Error: {error}</div>
      </div>
    )
  }

  const profileProps = { userProfile, userRole, userPosition, activeTab, setActiveTab }

  return (
    <div className="page-root">
      <main className="page-container user-info-page-container">
        <h1 className="page-heading user-info-page-title">User Information</h1>

        <SettingsNavbar userRole={userRole} />

        <div className="settings-container settings-container--profile">
          <div className="settings-sidebar settings-sidebar--profile">
            <button 
              className="sidebar-button active"
            >
              User Information
            </button>
            <button 
              onClick={() => navigate('/settings')} 
              className="sidebar-button"
            >
              Profile & Account
            </button>
          </div>

          <div className="settings-main settings-main--profile">
            <div className="settings-content settings-content--profile">
              <ProfileCard {...profileProps} />
            </div>
          </div>
        </div>
      </main>
    </div>
  )
}