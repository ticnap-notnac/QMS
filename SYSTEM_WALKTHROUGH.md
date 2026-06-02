# SYSTEM_WALKTHROUGH.md

## 1. System Overview
The Quality Management System (QMS) is a web application designed to streamline organizational processes, tracking quality reports (like Non-Conformance Reports - NCR), managing departments, and handling internal audits and suggestions. 

## 2. Tech Stack
- **Frontend**: React.js built with Vite.
- **Backend**: Node.js with Express.js.
- **Database**: PostgreSQL (hosted on Supabase).
- **Authentication**: Supabase Auth.
- **State Management**: React Context (`LookupContext`) + Local Component State + Custom Hooks.

## 3. Frontend Walkthrough
- **Folder Structure**: 
  - `components/`: Reusable UI elements (Navbars, Modals, Cards).
  - `pages/`: Main views (Dashboard, Settings, Reports, ISO).
  - `hooks/`: Custom React hooks containing isolated business logic (e.g., `useReportsLogic.js`, `useDCCLogic.js`).
  - `services/`: API wrapper functions that interface with the backend.
  - `lib/`: Utility libraries, including the base API request handler (`api.js`).
- **Routing**: Handled dynamically in `App.jsx` based on the `activePage` state rather than a dedicated router like React Router.
- **State Flow**: Global state (like lookups for roles and departments) is provided by `LookupContext`. Component-specific logic is abstracted into custom hooks.
- **API Communication**: The frontend uses `fetch` wrapped in a custom `request` function (`src/lib/api.js`) to communicate with the Express backend.

## 4. Backend Walkthrough
- **Server Structure**: Express application initialized in `server/index.js`.
- **Folder Structure**:
  - `routes/`: Express route definitions connecting endpoints to their respective controllers.
  - `controllers/`: Request handlers that extract parameters/body, call services, and send HTTP responses.
  - `services/`: Business logic and Supabase database interactions.
  - `lib/`: Utilities like `requestUtils.js` and the `supabase.js` client setup.
- **Database Flow**: The backend operates on a standard layered architecture: Routes -> Controllers -> Services -> Database.

## 5. Request Lifecycle
1. **Frontend Action**: A user clicks a button (e.g., "Save User").
2. **API Request**: A frontend service (e.g., `userService.js`) calls the generic `request()` function, attaching necessary headers (`x-user-auth-id`).
3. **Backend Processing**: Express routes the HTTP request to the corresponding controller (e.g., `userController.js`).
4. **Database Interaction**: The controller delegates to a backend service, which executes a Supabase query.
5. **Response Handling**: The backend sends a JSON response back to the frontend.
6. **UI Update**: The frontend hook updates its state based on the response, triggering a React re-render.

## 6. Database Structure
- **Users & Roles**: Manages system access levels and permissions.
- **Departments & Locations**: Defines the organizational structure.
- **Reports**: The core data entities for quality tracking (NCRs, Logs, Suggestions, ISO Standards).

## 7. Authentication & Authorization
- **Login Flow**: Users authenticate via Supabase Auth on the frontend (`Login.jsx`).
- **Session Handling**: The frontend stores the active session and sends the user's `auth_id` to the backend for subsequent requests.
- **Protected Routes**: The frontend conditionally renders pages and components based on the logged-in user's role (e.g., Admin Panel is restricted).

## 8. Current System Strengths
- **Separation of Concerns**: Excellent use of the MVC-like pattern on the backend (Routes -> Controllers -> Services).
- **Modularity**: Frontend business logic is well-abstracted into custom hooks, keeping components clean.
- **Centralized API**: The `lib/api.js` utility provides a clean foundation for network requests.

## 9. Current Weaknesses
- **Security**: The backend currently relies on the client-provided `x-user-auth-id` header without cryptographically verifying a JWT token, leaving endpoints vulnerable to spoofing.
- **Performance**: Several React hooks execute `setState` synchronously within `useEffect`, leading to unnecessary cascading renders.
- **Code Duplication**: Boilerplate logic for API headers and request actor extraction is repeated across many files.

## 10. Suggested Improvements
- **Short-term Fixes**: 
  - Resolve React `useEffect` anti-patterns.
  - Centralize the `buildAuthHeaders` logic into `src/lib/api.js` to DRY up frontend services.
- **Long-term Improvements**: 
  - Implement a robust Express middleware to validate Supabase JWTs (`Authorization: Bearer <token>`) to secure backend routes.
  - Migrate frontend routing to React Router for better URL management and deep linking.
- **Scalability Suggestions**: Introduce pagination for large datasets (e.g., System Logs, Reports) rather than fetching all records at once.
