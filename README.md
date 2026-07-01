# QFlow — Quality Management System

Small React + Vite app with a Node/Express backend and Supabase for Postgres + Auth.

## Quick start

- Install dependencies:

```bash
npm install
npm install --prefix server
```
- Start both client and server for development:

```bash
npm run dev:all
```

Client usually runs at `http://localhost:5173` and server at `http://localhost:3000`.

## System Architecture

The project follows a standard modern decoupled Monorepo structure, strictly separating the Client and Server codebases for cleaner scaling and deployment.

```text
c:\SchoolStuffs\ThesisSystem\
│
├── server/                 # Express.js Backend API
│   ├── controllers/        # Business logic for each endpoint (e.g., ncrController.js)
│   ├── middlewares/        # Global interceptors (Auth, Zod Validation, Winston Error Logs)
│   ├── routes/             # API Endpoint definitions (/api/ncr)
│   ├── services/           # External service integrations (Supabase DB calls)
│   ├── utils/              # Helper utilities (Logger, AI CBR Engine, AsyncHandler)
│   ├── validations/        # Zod Schema definitions for robust security
│   └── index.js            # Express server initialization
│
├── src/                    # React.js + Vite Frontend
│   ├── components/         # Reusable UI parts
│   │   ├── Auth/           # Login screens
│   │   ├── Forms/          # Inputs and Dropdowns
│   │   ├── Layout/         # Main Layout wrappers (Navbar + AppRouter)
│   │   ├── Modals/         # Pop-up overlays (NCR Submit, Filters)
│   │   ├── Navbars/        # Top navigation
│   │   └── Reports/        # Feeds and List Views
│   ├── context/            # React Context Providers (LookupContext)
│   ├── hooks/              # Custom React Hooks (useReportsLogic, useAuth)
│   ├── lib/                # Core libraries (api.js global interceptor)
│   ├── pages/              # Top-level Page components (Dashboard, Reports)
│   ├── routes/             # AppRouter configuration
│   ├── services/           # Frontend API fetch wrappers
│   └── App.jsx             # React entry point
│
├── .env                    # Frontend Environment Variables
├── server/.env             # Backend Environment Variables
└── package.json            # Monorepo Scripts
```

## Important environment variables

- **Frontend (`.env` in project root)**:
  - `VITE_SUPABASE_URL` (Base URL for your Supabase project)
  - `VITE_SUPABASE_PUBLISHABLE_KEY` (Publishable / Anon Key)
  - `VITE_API_BASE_URL` (Node API endpoint, e.g., `http://localhost:3000/api`)

- **Server (`server/.env` in server directory)**:
  - `SUPABASE_URL` (Base URL for your Supabase project - *DO NOT append `/rest/v1/`*)
  - `SUPABASE_SERVICE_ROLE_KEY` (Service role key — required for privileged logs and admin operations)
  - `GEMINI_API_KEY` (Google Gemini Developer API Key — required for AI suggestion fallbacks)
  - `PORT` (Optional, defaults to 3000)

> [!IMPORTANT]
> The `.env` files are ignored by Git. When pulling/cloning for the first time, you must manually create both `.env` files.
> Always stop and restart your terminal dev server (Ctrl+C and `npm run dev:all`) after editing any `.env` file for changes to take effect.

## Troubleshooting 401 Unauthorized Errors

If you or a groupmate run into `401 (Unauthorized)` errors:
1. **Invalid Session Caching**: Open browser DevTools (F12) -> **Application** -> **Local Storage** -> Clear all. Also clear **IndexedDB** databases related to Supabase and refresh. This forces a fresh login session.
2. **Incorrect URL Formatting**: Make sure `SUPABASE_URL` in `server/.env` does not end with `/rest/v1/`. It should be just the base URL (e.g., `https://xxxx.supabase.co`).
3. **Mismatched project keys**: Verify that the project ID in `VITE_SUPABASE_URL` matches the server `SUPABASE_URL` exactly.
4. **Dev Server Restart**: Restart the terminal dev environment (`npm run dev:all`) to load the new `.env` configurations.

## What's implemented (high-level)

### System & Core Features
- Centralized system logging: backend endpoints under `/api/logs` write to `system_logs` and `system_log_reads`. System logs are intended for admin viewing only.
- Audit helpers consolidated on the server for consistent, single-source logging of create/delete operations.
- Login/Logout audit events are recorded, but login is now recorded only once per browser session (prevents duplicates when switching tabs).
- Inactivity auto-logout: the client implements an inactivity timer (default 30 minutes) with a pre-timeout warning. 
- Comprehensive Role-Based Access Controls (RBAC) securely restricting routes and data visibility across the Dashboard, DCC panel, and CAR reports.

### Advanced AI Integration
- **Semantic Recurring Detection Alerts:** Background jobs analyze new reports against the database using Asymmetric Semantic Search, automatically generating Gemini-backed summaries for recurring trends.
- **Semantic Auto-Classification:** Automated mapping of unstructured defect descriptions into exact checkbox categories for CAR and QDDR forms.

### Lexical & Rule-Based Engines
- **Lexical Clause Mapping:** High-speed Jaccard similarity engine that maps defect descriptions strictly to ISO Standard Clauses via keyword proximity (available on CAR reports via `CARModal`).
- **Heuristic Rule Engine:** Built-in local offline engine that guarantees 100% system uptime by providing rule-based CAPA suggestions if external AI APIs ever fail.

### User Interface & Accessibility
- **Live Dashboard Analytics:** Dashboard widgets directly bound to live database metrics with clickable row navigation.
- **Accessibility Preferences:** Fully functional Accessibility settings page featuring scalable text contrast, uniform tabbing, and persistent outline shapes for visually impaired users.
- **ISO Standards Management:** Full edit functionality and responsive layout toggles for managing internal ISO clauses.

## Industry Standards Readiness

During our Industry Standards Readiness sprints, we heavily optimized and secured the system architecture:

### 1. Enterprise Security
- **Helmet.js** protects against cross-site scripting (XSS) and packet sniffing by injecting strict HTTP security headers.
- **Express Rate Limiting** blocks brute-force login attempts and DDoS attacks (maximum 100 requests per 15 minutes per IP).
- **Zod Schema Validation** intercepts all incoming requests to ensure malicious payloads are stripped out before they ever reach the database.

### 2. Performance & Scaling
- **In-Memory API Caching:** The Node.js server uses `node-cache` to memorize static configuration tables (Departments, Roles) for 5 minutes. This prevents unnecessary Supabase billing and ensures instantaneous frontend form loading.
- **Database B-Tree Indexes:** Custom SQL indexes were injected into frequently queried columns (`user_id`, `status`, `batch_number`, `is_read`) to ensure the system remains lightning fast even after thousands of reports are generated.
- **Query Pagination Limits:** A hard limit of 1000 rows was enforced on heavy backend `GET` requests (e.g., `fetchAllUsers`, `fetchReports`) to prevent the Node.js server from exhausting its heap memory and crashing under heavy data loads.

### 3. Automated Testing Pipeline
- **Vitest & Supertest:** A dedicated backend test suite isolates the database and runs automated health checks against our Express routes and Zod validation middleware. The backend test environment is correctly isolated from the React frontend test environment.

## Neuro-Symbolic Case-Based Reasoning (CBR) Algorithm

The system features a highly intelligent **LLM-Augmented Case-Based Reasoning** engine (`server/utils/cbr.js`) to automatically suggest the most historically effective corrective and preventive actions. 

### Step 1: Semantic Feature Extraction
Before any logic is run, the system uses Semantic AI to read the raw defect description and extract its core technical concepts. This ensures the CBR engine is comparing meaning, not just exact spelling.

### Step 2: Deterministic Scoring (Symbolic)
Instead of just fetching the "newest" reports, the engine dynamically scores all past cases based on a custom mathematical weight formula:
- **Issue Type Match:** 35%
- **Keyword Jaccard Similarity:** 35%
- **Severity Level Match:** 15%
- **Department Match:** 10%
- **Product Type Match:** 5%

The resulting raw similarity score is then dynamically blended with the past case's historical **Effectiveness Rating** (a 0-5 scale). The system calculates: `(Similarity Score * 85%) + (Effectiveness Rating * 15%)`. This guarantees that the AI always recommends the past solution that is both mathematically similar to the current issue AND proven to be highly effective.

### Step 3: Generative AI Fallback (RAG)
If the CBR engine fails to find a historically similar case (meaning the defect is entirely unique), the system automatically triggers a **Retrieval-Augmented Generation (RAG) Fallback**. It bundles the closest partial matches and the current defect details into a prompt, and uses the Gemini AI to generate a brand new, highly contextualized CAPA suggestion from scratch.

## Advanced AI Architecture & Optimization

To ensure enterprise-grade scalability and strict cost management on zero-cost free tiers, QFlow utilizes a highly advanced **Hybrid Neuro-Symbolic** approach.

### 1. Model Routing Optimization
Instead of relying on a single heavy LLM for all tasks, workloads are decoupled based on frequency and reasoning requirements:
- **Background Tasks (Gemini 2.5 Flash-Lite):** High-frequency, low-reasoning tasks like Semantic Auto-Classification of discrepancy tags and initial CAPA suggestions are routed to Google's fastest model. This maximizes throughput (up to 1,000 API requests per day) and minimizes latency.
- **Conversational Chatbot (OpenRouter / GPT-4o-mini):** Low-frequency, high-reasoning tasks involving RAG, context memory, and data summarization are reserved for heavy reasoning models via the OpenRouter API.

### 2. Asymmetric Semantic Search (Query Expansion)
To prevent API rate-limiting during Case-Based Reasoning, the system employs **Asymmetric Semantic Search**:
1. **Semantic Expansion:** When a new defect is logged, exactly *one* request is sent to Gemini to semantically extract its core concepts (e.g., expanding "leak" to "water, fluid, spill").
2. **Lexical Matching:** These expanded keywords are then matched offline against the entire database using the deterministic Jaccard Lexical engine.
This guarantees that the system gains the deep context understanding of an LLM while maintaining the extreme speed, offline capability, and $0 cost of a traditional SQL lexical search.

### 3. Graceful Degradation (Heuristic Fallback)
In the event of API outages, missing keys, or rate limits, the system features a built-in **Heuristic Rule Engine**. If an LLM call fails, the system instantly degrades gracefully by running local offline keyword rules to suggest backup CAPA actions and checkbox classifications—ensuring 100% uninterrupted system uptime.

## How to test the auth/session & logging fixes

1. Start the server and client (`npm run dev:server` and `npm run dev` or `npm run dev:all`).
2. Open the app, sign in with a test account.
   - Confirm `login_logged` is present in your browser's session storage (Application → Session Storage).
   - Check System Logs (DCC panel) for a single `user_login` entry.
3. Switch tabs, refresh, or re-open the app — no additional `user_login` entries should appear while the sessionStorage flag remains set.
4. Sign out — `login_logged` should be removed and a `user_logout` audit added.
5. To test inactivity locally, temporarily shorten the timeout in [src/App.jsx](src/App.jsx) (constants `TIMEOUT_MS` and `WARNING_MS`) and verify the warning prompt and auto-logout behavior.

Notes:
- `sessionStorage` is per-tab. If you prefer a login flag shared across tabs, change to `localStorage` in [src/App.jsx](src/App.jsx).
- The current warning uses a browser `confirm` for simplicity; replace with a modal/banner if you want a nicer UI.

## Troubleshooting

- If logs do not appear in the UI, confirm the server has access to the Supabase service role key and check server logs for errors. The server is mounted at [server/index.js](server/index.js).
- If deletes or admin operations fail with DB/auth errors, ensure `SUPABASE_SERVICE_ROLE_KEY` and `SUPABASE_URL` are correct and that the server app can reach Supabase.

## Contributing

Please follow the project conventions in the repo. `CODE_REVIEW.md` contains a recent code audit.

---
Generated and maintained by the QFlow dev team.
