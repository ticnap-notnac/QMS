import { Routes, Route } from 'react-router-dom'
import DashboardPage from '@/pages/DashboardPage.jsx'
import ReportsPage from '@/pages/ReportsPage.jsx'
import ISOPage from '@/pages/ISOPage.jsx'
import DCCPage from '@/pages/DCCPage.jsx'
import UserInformationPage from '@/pages/UserInformationPage.jsx'
import AddUserPage from '@/pages/AddUserPage.jsx'
import RolesPage from '@/pages/RolesPage.jsx'
import DepartmentsPage from '@/pages/DepartmentsPage.jsx'
import LocationsPage from '@/pages/LocationsPage.jsx'
import ProductTypesPage from '@/pages/ProductTypesPage.jsx'
import ISOStandardsPage from '@/pages/ISOStandardsPage.jsx'
import SettingsPage from '@/pages/SettingsPage.jsx'
import AuditToolsPage from '@/pages/AuditToolsPage.jsx'

export default function AppRouter({ sharedProps, refreshUserData }) {
  return (
    <Routes>
      <Route path="/" element={<DashboardPage {...sharedProps} />} />
      <Route path="/reports" element={<ReportsPage {...sharedProps} />} />
      <Route path="/iso" element={<ISOPage {...sharedProps} />} />
      <Route path="/dcc" element={<DCCPage {...sharedProps} />} />
      <Route path="/settings" element={<SettingsPage {...sharedProps} onProfileUpdate={refreshUserData} />} />
      <Route path="/settings/profile" element={<UserInformationPage {...sharedProps} />} />
      <Route path="/settings/roles" element={<RolesPage {...sharedProps} />} />
      <Route path="/settings/departments" element={<DepartmentsPage {...sharedProps} />} />
      <Route path="/settings/locations" element={<LocationsPage {...sharedProps} />} />
      <Route path="/settings/product-types" element={<ProductTypesPage {...sharedProps} />} />
      <Route path="/settings/iso-standards" element={<ISOStandardsPage {...sharedProps} />} />
      <Route path="/admin" element={<AddUserPage {...sharedProps} />} />
      <Route path="/audit-tools" element={<AuditToolsPage {...sharedProps} />} />
    </Routes>
  )
}
