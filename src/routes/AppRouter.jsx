import { Routes, Route } from 'react-router-dom'
import { Suspense, lazy } from 'react'
import { LoaderCircle } from 'lucide-react'

// Lazy load pages to enable code-splitting
const DashboardPage = lazy(() => import('@/pages/DashboardPage.jsx'))
const ReportsPage = lazy(() => import('@/pages/ReportsPage.jsx'))
const ISOPage = lazy(() => import('@/pages/ISOPage.jsx'))
const DCCPage = lazy(() => import('@/pages/DCCPage.jsx'))
const UserInformationPage = lazy(() => import('@/pages/UserInformationPage.jsx'))
const AddUserPage = lazy(() => import('@/pages/AddUserPage.jsx'))
const RolesPage = lazy(() => import('@/pages/RolesPage.jsx'))
const DepartmentsPage = lazy(() => import('@/pages/DepartmentsPage.jsx'))
const LocationsPage = lazy(() => import('@/pages/LocationsPage.jsx'))
const ProductTypesPage = lazy(() => import('@/pages/ProductTypesPage.jsx'))
const ISOStandardsPage = lazy(() => import('@/pages/ISOStandardsPage.jsx'))
const SettingsPage = lazy(() => import('@/pages/SettingsPage.jsx'))
const AuditToolsPage = lazy(() => import('@/pages/AuditToolsPage.jsx'))

const PageLoader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', width: '100%', minHeight: '400px' }}>
    <LoaderCircle size={32} className="iso-spinner" color="#0f172a" />
  </div>
)

export default function AppRouter({ sharedProps, refreshUserData }) {
  return (
    <Suspense fallback={<PageLoader />}>
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
    </Suspense>
  )
}
