# ThesisSystem Code Review

This document reviews the entire codebase in file order and explains what each file does, how the pieces connect, and where the main risks are.

## Backend (`server/`)

### `lib/supabase.js`
Initializes the backend Supabase client.

- What it does: loads environment variables, normalizes the Supabase URL, and creates a privileged Supabase client for server-side work.
- Functions:
  - `normalizeSupabaseUrl(rawUrl)`: removes `/rest/v1` or `/auth/v1` from the configured URL so the client uses the base project URL.
- Connections:
  - Uses `dotenv`, `path`, `fileURLToPath`, and `@supabase/supabase-js`.
  - Exported `supabase` is used by all backend controllers.
- Issues / improvements:
  - The server accepts `VITE_SUPABASE_URL` as a fallback, which is convenient but confusing for a backend file.
  - The code depends on the service role key; if the env is wrong, the server fails early.
  - This file is security-sensitive because it controls the admin client.

### `lib/audit.js`
Shared helper for writing audit logs.

- What it does: centralizes inserts into `system_logs` and avoids breaking the main request if logging fails.
- Functions:
  - `writeAudit({...})`: builds the log payload and inserts it into `system_logs`.
- Connections:
  - Uses the backend `supabase` client.
  - Called by `userController.js`, `roleController.js`, and `departmentController.js`.
- Issues / improvements:
  - Logging failures are swallowed, so audit gaps can go unnoticed unless you watch server logs.

### `lib/requestUtils.js`
Extracts the acting user ID from a request.

- What it does: reads `userAuthId` from body, header, or query string.
- Functions:
  - `getRequestActor(req)`: returns the caller’s auth ID or `null`.
- Connections:
  - Used by delete handlers in the role, department, and user controllers.
- Issues / improvements:
  - It trusts request-supplied actor data, so it should only be used for audit metadata, not for authorization.

### `controllers/logController.js`
Handles system log read/write endpoints.

- What it does: lists logs, inserts logs, and records log reads.
- Functions:
  - `getLogs(req, res)`: reads from `system_logs`, applies filters, paginates, and enriches records with `user_display` from `users`.
  - `insertLog(req, res)`: maps camelCase `userAuthId` to snake_case and inserts a log row.
  - `recordLogRead(req, res)`: writes a row to `system_log_reads`.
- Connections:
  - Uses the backend `supabase` client.
  - Queried by `src/components/SystemLogsPanel.jsx` through `src/services/logService.js`.
- Issues / improvements:
  - The write endpoints do not enforce auth in code.
  - `insertLog()` accepts arbitrary payloads, so malformed or forged logs are possible if the API is exposed.
  - `getLogs()` does a second lookup into `users` on every request, which is fine for small loads but could be optimized later.

### `controllers/roleController.js`
CRUD for roles.

- What it does: lists, creates, and deletes roles.
- Functions:
  - `getRoles(_req, res)`: selects and sorts roles.
  - `createRole(req, res)`: inserts a role after validating `roleName`.
  - `deleteRole(req, res)`: loads the row, deletes it, then writes an audit log.
- Connections:
  - Uses `supabase`.
  - Calls `writeAudit()` and `getRequestActor()`.
  - Called by `server/routes/roleRoutes.js`.
- Issues / improvements:
  - Delete logging is centralized, but create logging still depends on the frontend.
  - No auth middleware is visible here.

### `controllers/departmentController.js`
CRUD for departments.

- What it does: lists, creates, and deletes departments.
- Functions:
  - `getDepartments(_req, res)`: selects and sorts departments.
  - `createDepartment(req, res)`: inserts a department after validating `departmentName`.
  - `deleteDepartment(req, res)`: loads the row, deletes it, then writes an audit log.
- Connections:
  - Uses `supabase`.
  - Calls `writeAudit()` and `getRequestActor()`.
  - Called by `server/routes/departmentRoutes.js`.
- Issues / improvements:
  - Same auth and logging caveats as the roles controller.

### `controllers/userController.js`
User management controller.

- What it does: lists profiles, creates new auth users + matching profile lookup, and deletes users from both tables.
- Functions:
  - `getUsers(_req, res)`: selects user profile rows from `users`.
  - `createUser(req, res)`: validates input, creates a Supabase Auth user, then fetches the matching profile row.
  - `deleteUser(req, res)`: loads the profile, deletes `public.users`, deletes the Supabase Auth account, then writes an audit log.
- Connections:
  - Uses `hasServiceRole`, `supabase`, `writeAudit()`, and `getRequestActor()`.
  - Called by `server/routes/userRoutes.js`.
- Issues / improvements:
  - The delete flow can partially succeed, leaving the system inconsistent if the second delete fails.
  - `createUser()` relies on a later profile lookup rather than a transactional write.
  - This controller is especially sensitive because it touches both the public database and Auth admin APIs.

### `controllers/debugController.js`
Debug endpoint for environment inspection.

- What it does: returns whether a service role key exists and what Supabase URL the backend sees.
- Functions:
  - `getDebug(_req, res)`: returns the env summary.
- Connections:
  - Called by `server/routes/debugRoutes.js`.
- Issues / improvements:
  - Should stay admin-only or development-only because it reveals backend config details.

### `routes/logRoutes.js`
Registers log endpoints.

- What it does: maps `GET /api/logs`, `POST /api/logs`, and `POST /api/logs/reads` to the log controller.
- Connections:
  - Imports `getLogs`, `insertLog`, and `recordLogRead`.
- Issues / improvements:
  - No auth guard is visible here; all validation is deferred to the controller.

### `routes/roleRoutes.js`
Registers role endpoints.

- What it does: maps `GET`, `POST`, and `DELETE /api/roles` endpoints.
- Connections:
  - Imports `getRoles`, `createRole`, and `deleteRole`.
- Issues / improvements:
  - No route-level authorization or rate limiting is visible.

### `routes/departmentRoutes.js`
Registers department endpoints.

- What it does: maps `GET`, `POST`, and `DELETE /api/departments` endpoints.
- Connections:
  - Imports `getDepartments`, `createDepartment`, and `deleteDepartment`.
- Issues / improvements:
  - Same missing auth concerns as the role routes.

### `routes/userRoutes.js`
Registers user endpoints.

- What it does: maps `GET`, `POST`, and `DELETE /api/users` endpoints.
- Connections:
  - Imports `getUsers`, `createUser`, and `deleteUser`.
- Issues / improvements:
  - This route is the most sensitive and should be protected if the backend is reachable beyond localhost.

### `routes/debugRoutes.js`
Registers the debug endpoint.

- What it does: maps `GET /api/debug` to `getDebug()`.
- Connections:
  - Imports `getDebug`.
- Issues / improvements:
  - Should not be public in a production deployment.

### `index.js`
Bootstraps the server.

- What it does: loads env, creates the Express app, enables CORS and JSON parsing, mounts routes, and starts listening.
- Functions:
  - No custom functions; it is the server entry point.
- Connections:
  - Imports all route modules.
- Issues / improvements:
  - No auth middleware, no rate limiting, and no centralized error handler are visible.
  - The service-role Supabase client makes this a privileged API, so exposure should be deliberate.

---

## Frontend (`src/`)

### `lib/api.js`
Backend request wrapper.

- What it does: wraps `fetch()` and standardizes JSON parsing and error handling.
- Functions:
  - `request(path, options)`: sends a request to the backend API and throws on non-OK responses.
- Connections:
  - Used by all service modules and some hooks.
- Issues / improvements:
  - Network failures are still raw `fetch` errors.
  - The localhost fallback can hide deployment misconfiguration.

### `services/authService.js`
Current-auth helper.

- What it does: returns the signed-in user’s auth ID.
- Functions:
  - `getCurrentAuthId()`: calls `supabase.auth.getUser()` and returns the user ID or `null`.
- Connections:
  - Used by `logService.js`.
- Issues / improvements:
  - It silently returns `null` on any error, which is safe for logging but not ideal for diagnosing auth problems.

### `services/logService.js`
Log API wrapper.

- What it does: sends log writes, log reads, and log queries to the backend.
- Functions:
  - `insertLog(payload)`: POSTs to `/logs`.
  - `logAction({...})`: adds the current actor ID and records an audit event.
  - `fetchLogs({...})`: GETs `/logs` with filters and pagination.
  - `recordLogRead(payload)`: POSTs to `/logs/reads` and suppresses UI failures.
- Connections:
  - Uses `request()` and `getCurrentAuthId()`.
  - Consumed by `App.jsx`, `Login.jsx`, `SettingsPage.jsx`, `SystemLogsPanel.jsx`, and others.
- Issues / improvements:
  - Some pages still call `insertLog()` directly instead of `logAction()`.
  - Audit coverage is mixed between frontend and backend.

### `services/roleService.js`
Role API wrapper.

- What it does: loads roles, creates roles, and deletes roles.
- Functions:
  - `normalizeRoleError(error)`: converts raw errors into friendlier messages.
  - `loadRoles()`: GETs `/roles`.
  - `createRole(roleName)`: POSTs `/roles` and writes a create audit log.
  - `deleteRole(id)`: DELETEs `/roles/:id` and sends the actor ID in the body.
- Connections:
  - Uses `request()`, `insertLog()`, and Supabase Auth for actor lookup.
- Issues / improvements:
  - Actor lookup is duplicated here instead of reusing `getCurrentAuthId()`.
  - Create logging is still frontend-driven.

### `services/departmentService.js`
Department API wrapper.

- What it does: loads departments, creates departments, and deletes departments.
- Functions:
  - `loadDepartments()`: GETs `/departments`.
  - `createDepartment(departmentName)`: POSTs `/departments` and writes a create audit log.
  - `deleteDepartment(id)`: DELETEs `/departments/:id` and sends the actor ID in the body.
- Connections:
  - Uses `request()`, `insertLog()`, and Supabase Auth for actor lookup.
- Issues / improvements:
  - Same duplication and audit consistency concerns as `roleService.js`.

### `services/userService.js`
User create API wrapper.

- What it does: creates a new user through the backend and writes a create audit log.
- Functions:
  - `createUser(payload)`: POSTs `/users` and logs the result.
  - `createAdminUser`: backwards-compatible alias.
- Connections:
  - Uses `request()` and `insertLog()`.
- Issues / improvements:
  - The audit log does not include the acting admin’s ID.

### `hooks/useAuth.js`
Supabase auth state hook.

- What it does: tracks the current user, loading state, and auth errors, and exposes login/logout helpers.
- Functions:
  - Internal `checkUser()` effect.
  - `login(email, password)`.
  - `logout()`.
- Connections:
  - Uses Supabase Auth directly.
- Issues / improvements:
  - `App.jsx` has its own auth logic too, so auth state is managed in more than one place.

### `hooks/useCategoryManager.js`
Generic category CRUD state hook.

- What it does: manages list state, loading, error, delete state, and CRUD actions for category-like data.
- Functions:
  - `reload()`.
  - `createItem(name)`.
  - `deleteItem(id)`.
- Connections:
  - Consumed by `RolesPage.jsx` and `DepartmentsPage.jsx`.
- Issues / improvements:
  - It overlaps heavily with `useUserManager`, so they could be unified.

### `hooks/useFetch.js`
Generic Supabase read hook.

- What it does: fetches rows from a Supabase table with optional filters and limit.
- Functions:
  - `useFetch(table, options)`: returns `data`, `loading`, `error`, and `refetch()`.
- Connections:
  - Uses Supabase directly.
- Issues / improvements:
  - I found no current consumer.
  - The effect only depends on `table`, so `options` changes would not refetch.

### `hooks/useUserManager.js`
User CRUD state hook.

- What it does: loads users, delegates create logic, and handles user deletion with loading/error state.
- Functions:
  - `reload()`.
  - `createItem(userData)`.
  - `deleteItem(id)`.
- Connections:
  - Uses `request()` and Supabase Auth.
  - Consumed by `AddUserPage.jsx`.
- Issues / improvements:
  - It duplicates most of `useCategoryManager`.

### `context/LookupContext.jsx`
Shared roles/departments cache.

- What it does: loads roles and departments once and shares them across admin screens.
- Functions:
  - `reloadLookups()`.
  - `LookupProvider({ children })`.
  - `useLookup()`.
- Connections:
  - Used by `AddUserPage.jsx`, `RolesPage.jsx`, and `DepartmentsPage.jsx`.
- Issues / improvements:
  - The “preserve old values on empty reload” logic can hide real empties or deletions.

### `utils/userUtils.js`
User formatting helper.

- What it does: formats a readable display name from a user record.
- Functions:
  - `formatDisplayName(user)`.
- Connections:
  - Intended for pages/components that show user names.
- Issues / improvements:
  - It should be used more widely to eliminate inline formatting duplication.

### `utils/supabase.js`
Frontend Supabase client.

- What it does: creates the browser Supabase client from `VITE_SUPABASE_URL` and `VITE_SUPABASE_PUBLISHABLE_KEY`.
- Functions:
  - No custom functions; it exports a configured client.
- Connections:
  - Used by auth pages, profile pages, and some components.
- Issues / improvements:
  - The env var naming must be consistent across teammates.
  - A missing or stale key causes immediate app failures.

### `App.jsx`
Top-level app shell and navigation controller.

- What it does: owns sign-in state, resolves the current user profile/role, logs auth events, and chooses which page to render.
- Functions/flows:
  - `applyUserRoleData(profile)`: resolves display name, role, and position from profile + roles table.
  - Auth-check `useEffect`: loads the current user and profile on startup.
  - Auth-state `useEffect`: logs sign-in events.
  - `handleSubmit(authData)`: post-login callback from `Login`.
  - `refreshUserData()`: reloads profile data after settings updates.
  - `handleLogout()`: logs logout and clears UI state.
  - `handlePageChange(page)`: updates the active page.
  - `renderPage()`: chooses the page component.
- Connections:
  - Uses Supabase directly.
  - Uses `LookupProvider`.
  - Renders all pages.
  - Uses `insertLog()` for auth audit events.
- Issues / improvements:
  - Several debug `console.log`s remain.
  - It duplicates some user/profile lookup behavior found in `SettingsPage` and `UserInformationPage`.
  - It still contains a lot of orchestration logic in one file.

### `components/Login.jsx`
Sign-in screen.

- What it does: collects email/password, signs the user in, and records failed login attempts.
- Functions:
  - `handleSubmit(e)`.
- Connections:
  - Uses Supabase Auth and `insertLog()`.
  - Calls parent callbacks `onSubmit` and `onLearnMore`.
- Issues / improvements:
  - Failed-login audit logging depends on the frontend being able to reach the backend.

### `components/Navbar.jsx`
Main navigation bar.

- What it does: renders the app brand, main navigation tabs, notifications button, user info, and the user dropdown.
- Functions:
  - No custom functions, only the component render.
- Connections:
  - Consumed by most page components.
- Issues / improvements:
  - It duplicates some user-menu behavior from `UserMenu.jsx`.
  - It accepts props that are not consistently used.

### `components/UserMenu.jsx`
Alternate user menu component.

- What it does: fetches the current profile and renders a user menu with notifications and logout.
- Functions:
  - Internal `fetchUserProfile()` effect.
- Connections:
  - Uses Supabase directly.
- Issues / improvements:
  - Appears unused by the app.
  - Duplicates profile/role fetch logic already present elsewhere.

### `components/SettingsNavbar.jsx`
Settings top navigation.

- What it does: renders `User Information`, `Settings`, and optionally `Admin Panel`.
- Functions:
  - `navItem(label, page, Icon)`.
- Connections:
  - Used by settings/profile/admin pages.
- Issues / improvements:
  - Hardcoded page names are repeated in multiple places.

### `components/AdminNavbar.jsx`
Admin sub-navigation.

- What it does: renders `Users`, `Dept`, `Roles`, and disabled `ISO Module` tabs.
- Functions:
  - No custom named helpers beyond the component itself.
- Connections:
  - Used by the admin pages.
- Issues / improvements:
  - Tab names are hardcoded and repeated in page logic.

### `components/SearchForm.jsx`
Reusable search form.

- What it does: syncs a local input value and optionally debounces changes before notifying the parent.
- Functions:
  - Internal `handleChange(e)`.
- Connections:
  - Used by admin list pages.
- Issues / improvements:
  - Parent pages still reload manually, so some search flows are duplicated.

### `components/AddCategoryModal.jsx`
Simple add-category modal.

- What it does: renders a generic name input dialog for roles/departments.
- Functions:
  - No custom helpers; plain presentational component.
- Connections:
  - Used by `RolesPage.jsx` and `DepartmentsPage.jsx`.
- Issues / improvements:
  - Validation is left to the parent.

### `components/AddUserModal.jsx`
New-user modal.

- What it does: renders the create-user form and dropdowns for role/department selection.
- Functions:
  - No custom helpers; plain presentational component.
- Connections:
  - Used by `AddUserPage.jsx`.
- Issues / improvements:
  - The component is large and could be split if it grows further.

### `components/AdminListPanel.jsx`
Generic admin list with delete buttons.

- What it does: renders a list of items with a shared delete action.
- Functions:
  - No custom helpers; one render path.
- Connections:
  - Used by `RolesPage.jsx` and `DepartmentsPage.jsx`.
- Issues / improvements:
  - Only supports one label key and one action, so it is limited but simple.

### `components/Dashboard.jsx`
Dashboard metrics panel.

- What it does: tries to fetch metrics from Supabase and falls back to placeholder values.
- Functions:
  - Internal `fetchMetrics()` effect.
- Connections:
  - Uses Supabase directly.
- Issues / improvements:
  - It still looks like a stub and depends on a `metrics` table that may not exist.

### `components/IntroModal.jsx`
Intro/help modal.

- What it does: reads `LEARN_MORE.md`, splits it into chunks, and renders them as decorated sections.
- Functions:
  - No separate named helper functions beyond the inline markdown parsing logic.
- Connections:
  - Uses raw markdown import.
- Issues / improvements:
  - It is not a real markdown renderer; it only splits text into paragraphs.

### `components/NotificationsModal.jsx`
Notifications modal.

- What it does: loads the latest notifications and renders them in a popup.
- Functions:
  - Internal `fetchNotifications()` effect.
- Connections:
  - Uses Supabase directly.
- Issues / improvements:
  - It bypasses the service layer and currently renders a lot of placeholder UI.

### `components/SystemLogsPanel.jsx`
System log viewer.

- What it does: fetches system logs, supports simple search and paging, and records log reads.
- Functions:
  - Internal `load(opts)`.
  - `handleSearch()`.
- Connections:
  - Uses `fetchLogs()` and `recordLogRead()`.
  - Displayed inside `DCCPage.jsx`.
- Issues / improvements:
  - Search currently targets the `action` field more than free text.
  - Read tracking can overcount if you refresh often.

### `pages/DashboardPage.jsx`
Dashboard page wrapper.

- What it does: composes `Navbar` and `Dashboard`.
- Functions:
  - No custom logic beyond the component render.
- Connections:
  - Consumes shared nav props from `App.jsx`.
- Issues / improvements:
  - It still logs the role during render.

### `pages/ReportsPage.jsx`
Report composition page.

- What it does: renders a report UI with several local modal states.
- Functions:
  - Inline modal toggles such as `triggerCarModalTransition()`, `triggerQddrModalTransition()`, and `triggerPreventiveActionTransition()`.
- Connections:
  - Uses `Navbar`.
- Issues / improvements:
  - Mostly placeholder UI and no persistence yet.

### `pages/ISOPage.jsx`
ISO composition page.

- What it does: renders an ISO dashboard with task-selection modals and progress rows.
- Functions:
  - Inline open/close helpers such as `openAuditTask()`, `openCapaTask()`, `openDocumentTask()`, and `openTrainingTask()`.
  - `ProgressRow` helper component.
- Connections:
  - Uses `Navbar`.
- Issues / improvements:
  - Mostly placeholder UI and no backend data flow.

### `pages/DCCPage.jsx`
Document control center.

- What it does: shows folders, recent items, and opens the system logs panel for admins.
- Functions:
  - `saveRecentlyViewed(list)`.
  - `addRecentlyViewed(item)`.
  - `openFolder(item)`.
- Connections:
  - Uses `Navbar` and `SystemLogsPanel`.
- Issues / improvements:
  - Search is cosmetic.
  - Folder data is static.

### `pages/AddUserPage.jsx`
Admin user-management page.

- What it does: lists users, opens the add-user modal, and deletes users.
- Functions:
  - `handleUserFieldChange(event)`.
  - `openAddUserModal()`.
  - `closeAddUserModal()`.
  - `handleSubmitNewUser(event)`.
  - `handleDeleteUser(user)`.
- Connections:
  - Uses `useLookup()`, `useUserManager()`, `createUser()`, `SearchForm`, `AddUserModal`, `Navbar`, `SettingsNavbar`, `AdminNavbar`.
- Issues / improvements:
  - Some imports are now redundant after the duplicate-log cleanup.
  - Role/department display is driven by lookup context, so stale lookup data can affect the table.

### `pages/RolesPage.jsx`
Admin role-management page.

- What it does: lists roles, allows creation, and allows deletion.
- Functions:
  - `openCategoryModal()`.
  - `closeCategoryModal()`.
  - `handleSubmitCategory(event)`.
  - `handleDeleteRole(role)`.
- Connections:
  - Uses `useCategoryManager()`, `useLookup()`, `roleService`, `SearchForm`, `AddCategoryModal`, `AdminListPanel`.
- Issues / improvements:
  - Much of its structure is duplicated by the departments page.

### `pages/DepartmentsPage.jsx`
Admin department-management page.

- What it does: lists departments, allows creation, and allows deletion.
- Functions:
  - `openCategoryModal()`.
  - `closeCategoryModal()`.
  - `handleSubmitCategory(event)`.
  - `handleDeleteDepartment(department)`.
- Connections:
  - Uses `useCategoryManager()`, `useLookup()`, `departmentService`, `SearchForm`, `AddCategoryModal`, `AdminListPanel`.
- Issues / improvements:
  - Mostly a copy of the roles page with different labels.

### `pages/SettingsPage.jsx`
Profile/settings editor.

- What it does: loads the current profile, lets the user edit account details, and updates the password if requested.
- Functions:
  - Internal profile-fetch effect.
  - `handleUpdateChanges()`.
- Connections:
  - Uses Supabase directly, plus `insertLog()` and `Navbar`/`SettingsNavbar`.
- Issues / improvements:
  - Profile update and password change are not transactional.
  - It duplicates profile-fetch logic found in `UserInformationPage.jsx`.

### `pages/AuditToolsPage.jsx`
Audit tools placeholder.

- What it does: shows placeholder tabs for logs and reports.
- Functions:
  - No business logic beyond local `activeTab` state.
- Connections:
  - Uses `Navbar`.
- Issues / improvements:
  - It is a stub and does not connect to real audit data.

### `pages/UserInformationPage.jsx`
Read-only user profile page.

- What it does: shows the current user’s profile details and overview.
- Functions:
  - Internal profile-fetch effect.
- Connections:
  - Uses Supabase directly, `Navbar`, and `SettingsNavbar`.
- Issues / improvements:
  - It hardcodes the department text instead of using the actual department record.
  - Its fetch logic overlaps with `SettingsPage.jsx`.

### `index.css`
Global CSS baseline.

- What it does: sets theme variables, global box sizing, and base body/root styling.
- Issues / improvements:
  - Fine structurally, but the theme variables could be centralized more clearly if the app grows.

### `App.css`
Top-level app CSS.

- What it does: styles the shell, login view, dashboard, modals, and a large amount of shared layout.
- Issues / improvements:
  - Many layout patterns overlap with `components.css` and `PagesStyles.css`, so the stylesheet is spread across three places.

### `components/components.css`
Shared component CSS.

- What it does: styles navbar, menus, admin controls, system logs, and notification states.
- Issues / improvements:
  - Repeats visual patterns that also exist in `App.css` and `PagesStyles.css`.

### `pages/PagesStyles.css`
Page-level CSS.

- What it does: styles the big admin/settings/ISO/DCC pages.
- Issues / improvements:
  - Large and repetitive; this is a good candidate for future feature-based splitting.

### `main.jsx`
React entry point.

- What it does: mounts `App` into `#root`.
- Issues / improvements:
  - Standard Vite entry file; no major issue.

---

## Duplication and Simplification Notes

- Duplicate user-auth lookup logic appears in `App.jsx`, `SettingsPage.jsx`, `UserInformationPage.jsx`, `roleService.js`, `departmentService.js`, `useUserManager.js`, and some delete handlers.
- `useCategoryManager.js` and `useUserManager.js` are very similar and could be merged into a generic CRUD hook.
- `Navbar.jsx` and `UserMenu.jsx` overlap in behavior.
- `App.css`, `components/components.css`, and `pages/PagesStyles.css` repeat a lot of visual styles.
- `RolesPage.jsx` and `DepartmentsPage.jsx` are nearly the same page with different labels.

## Security Notes

- The backend uses a service-role Supabase client, so the server should be treated as privileged.
- There is no visible auth middleware on the Express routes.
- `GET /api/debug` leaks environment metadata and should be limited to development/admin-only use.
- Log write endpoints accept client-submitted payloads, so they can be forged if the backend is exposed publicly.

## Data Flow Diagram

```text
User action in UI
  -> page/component in src/
  -> hook or service
  -> src/lib/api.js or src/utils/supabase.js
  -> Express route in server/routes/
  -> controller in server/controllers/
  -> Supabase Auth or Postgres table
  -> response back to frontend
  -> hook/page updates state
  -> UI rerenders

Example: delete department
  -> DepartmentsPage.jsx
  -> useCategoryManager.deleteItem()
  -> departmentService.deleteDepartment()
  -> DELETE /api/departments/:id
  -> departmentController.deleteDepartment()
  -> departments table delete
  -> writeAudit()
  -> system_logs table
  -> UI reloads roles/departments lookup
```
