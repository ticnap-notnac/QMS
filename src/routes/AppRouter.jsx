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
const PermissionsPage = lazy(() => import('@/pages/PermissionsPage.jsx'))

const PageLoader = () => (
  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', width: '100%', minHeight: '400px' }}>
    <LoaderCircle size={32} className="iso-spinner" color="#0f172a" />
  </div>
)

const AccessDenied = () => (
  <div className="page-root">
    <main className="page-main-centered">
      <h1 className="page-title">Access Denied</h1>
      <div className="access-denied-text">You don't have permission to access this page. Please contact your administrator if you need access.</div>
    </main>
  </div>
)

const ProtectedRoute = ({ pageKey, sharedProps, children }) => {
  const normalizedRole = String(sharedProps?.userRole || '').trim().toLowerCase()
  if (normalizedRole === 'admin') return children

  const pagesList = Array.isArray(sharedProps?.userPermissions?.pages) ? sharedProps.userPermissions.pages : []
  if (pageKey && !pagesList.includes(pageKey)) {
    return <AccessDenied />
  }

  return children
}

export default function AppRouter({ sharedProps, refreshUserData }) {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        <Route path="/" element={<ProtectedRoute pageKey="dashboard" sharedProps={sharedProps}><DashboardPage {...sharedProps} /></ProtectedRoute>} />
        <Route path="/reports" element={<ProtectedRoute pageKey="reports" sharedProps={sharedProps}><ReportsPage {...sharedProps} /></ProtectedRoute>} />
        <Route path="/iso" element={<ProtectedRoute pageKey="iso" sharedProps={sharedProps}><ISOPage {...sharedProps} /></ProtectedRoute>} />
        <Route path="/dcc" element={<ProtectedRoute pageKey="dcc" sharedProps={sharedProps}><DCCPage {...sharedProps} /></ProtectedRoute>} />
        <Route path="/settings" element={<SettingsPage {...sharedProps} onProfileUpdate={refreshUserData} />} />
        <Route path="/settings/profile" element={<UserInformationPage {...sharedProps} />} />
        <Route path="/settings/roles" element={<ProtectedRoute pageKey="admin_panel" sharedProps={sharedProps}><RolesPage {...sharedProps} /></ProtectedRoute>} />
        <Route path="/settings/permissions" element={<ProtectedRoute pageKey="admin_panel" sharedProps={sharedProps}><PermissionsPage {...sharedProps} /></ProtectedRoute>} />
        <Route path="/settings/departments" element={<ProtectedRoute pageKey="admin_panel" sharedProps={sharedProps}><DepartmentsPage {...sharedProps} /></ProtectedRoute>} />
        <Route path="/settings/locations" element={<ProtectedRoute pageKey="admin_panel" sharedProps={sharedProps}><LocationsPage {...sharedProps} /></ProtectedRoute>} />
        <Route path="/settings/product-types" element={<ProtectedRoute pageKey="admin_panel" sharedProps={sharedProps}><ProductTypesPage {...sharedProps} /></ProtectedRoute>} />
        <Route path="/settings/iso-standards" element={<ProtectedRoute pageKey="admin_panel" sharedProps={sharedProps}><ISOStandardsPage {...sharedProps} /></ProtectedRoute>} />
        <Route path="/admin" element={<ProtectedRoute pageKey="admin_panel" sharedProps={sharedProps}><AddUserPage {...sharedProps} /></ProtectedRoute>} />
        <Route path="/audit-tools" element={<ProtectedRoute pageKey="audit_tools" sharedProps={sharedProps}><AuditToolsPage {...sharedProps} /></ProtectedRoute>} />
      </Routes>
    </Suspense>
  )
}
