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
│   ├── controllers/        # Request parsing and HTTP orchestration
│   ├── middlewares/        # Global interceptors (Auth, Zod Validation, Error handling)
│   ├── routes/             # API Endpoint definitions (/api/car, /api/qddr, /api/suggestions, etc.)
│   ├── services/           # Business logic and external service integrations (Supabase DB calls)
│   ├── utils/              # Helper utilities (Logger, AI CBR Engine, Queue, AsyncHandler)
│   ├── validations/        # Zod Schema definitions for robust request security
│   ├── workers/            # Background jobs and task queues (pg-boss for CBR engine)
│   ├── index.js            # Express app configuration & middleware pipeline
│   └── server.js           # Server entry point with background queue startup
│
├── src/                    # React.js + Vite Frontend
│   ├── components/         # Reusable UI parts
│   │   ├── AuditTools/     # Internal Audit schedules and checklist templates
│   │   ├── Auth/           # Login and authentication screens
│   │   ├── Cards/          # Stat and metric cards
│   │   ├── Dashboard/      # Interactive analytics widgets and charts
│   │   ├── Forms/          # Form inputs and SearchableDropdown components
│   │   ├── ISOPage/        # ISO Clauses viewer and management
│   │   ├── ISOStandards/   # ISO standard configurations
│   │   ├── Layout/         # Main layout wrappers (Navbar, Sidebar, AppRouter)
│   │   ├── Modals/         # Overlays (CARModal, QDDRModal, CARDetailsModal, QDDRDetailsModal, Filters)
│   │   ├── Navbars/        # Navigation bars and notification menus
│   │   ├── Panels/         # DCC, Accessibility, and Profile panels
│   │   ├── Print/          # High-fidelity printable report templates (CAR, QDDR)
│   │   ├── Reports/        # Feeds, tabs, and list views for CAR & QDDR
│   │   └── UsersTable/     # User Management data tables
│   ├── context/            # React Context Providers (LookupContext, AuthContext)
│   ├── hooks/              # Custom React Hooks (useReportsLogic, useCARDetails, useCARForm, useQDDRForm, useAuth)
│   ├── lib/                # Core libraries (api.js global interceptor)
│   ├── pages/              # Top-level Page components (Dashboard, Reports, AuditTools, DCC, ISOPage, Settings)
│   ├── routes/             # AppRouter configuration with RBAC route guards
│   ├── services/           # Frontend API fetch wrappers
│   └── App.jsx             # React entry point with inactivity timeout handler
│
├── db/
│   ├── migrations/         # Supabase PostgreSQL schema migrations
│   └── schema.sql          # Consolidated database schema definition
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
  - `SUPABASE_SERVICE_ROLE_KEY` (Service role key — required for privileged logs, user management, and admin operations)
  - `GEMINI_API_KEY` (Google Gemini Developer API Key — required for AI suggestion fallbacks, label scanning, and vision analysis)
  - `DATABASE_URL` / `PG_BOSS_DATABASE_URL` (Postgres connection string for `pg-boss` background queues)
  - `RESEND_API_KEY` (Optional: Resend API key for automated user credentials email dispatch)
  - `OPENROUTER_API_KEY` (Optional: OpenRouter API key for high-reasoning conversational assistant)
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
- Background Job Queues: Uses `pg-boss` (Postgres-based queue) for highly reliable background processing of time-consuming tasks (like AI CBR engine requests).

### Advanced AI Integration
- **Semantic Recurring Detection Alerts:** Background jobs analyze new reports against the database using Asymmetric Semantic Search, automatically generating Gemini-backed summaries for recurring trends.
- **Semantic Auto-Classification:** Automated mapping of unstructured defect descriptions into exact checkbox categories for CAR and QDDR forms.
- **Vision-Assisted Pallet Label & Barcode Scanner:** Live camera and image upload scanner using Gemini Vision (`gemini-2.5-flash-lite`) and historical report matching to auto-extract warehouse Material Code, Material Description (with Expiry Date), and Batch/SU numbers.
- **Photo-Driven Reason of Discrepancy Generator:** Multi-modal analysis synthesizing required report metadata (Location, Material Code, Description, Batch, Quantity) with uploaded defect photos to generate objective discrepancy descriptions and auto-select matching discrepancy checkboxes.

### Quality Defect & Discrepancy Report (QDDR) Workflow
- **Multi-File Evidence & Attachments:** Supports uploading up to 3 evidence files (Images: JPG, PNG, WEBP; Documents: PDF, DOC, DOCX up to 10 MB each), uploaded to Supabase Storage (`audit-evidence/qddr`) with client-side Base64 fallback, with viewing support in details modals and print templates.
- **Automated Submission Timestamping:** System automatically records and stamps the exact submission date (`YYYY-MM-DD`) and local time (`HH:mm:ss`), eliminating manual date/time input errors while preserving audit integrity.

### Corrective Action Request (CAR) & CAPA Workflow
- **Interactive Root Cause Analysis (RCA) Builder:** Structured RCA methodology tabs allowing quality inspectors to analyze issues using **5 Whys**, **Fishbone Diagram (6M)** (*Man, Machine, Material, Method, Measurement, Environment*), or **Both (Fishbone 6M + 5 Whys)**.
- **Human-in-the-Loop RCA Integrity:** Root Cause Analysis is strictly authored by responsible investigators and is never overwritten by AI or past case guesses.
- **Root-Cause-Driven CBR (Case-Based Reasoning):** The user's completed 5 Whys / Fishbone analysis and Non-Conformance Details serve as the dual basis for the CBR engine to retrieve proven solutions from `car_case_repository` and suggest only Immediate Corrective Actions and Preventive Action Plans.
- **Verification of Effectiveness (VoE):** Closed-loop verification by designated verifiers with 5-point rating scale (`Excellent`, `Good`, `Ok`, `Poor`, `Very Poor`), verification evidence notes, date locks, and automatic re-opening if deemed ineffective.
- **Closed Case Promotion with RCA Embeddings:** When a CAR is verified effective and closed, its vector embedding incorporates both the non-conformance details and the structured root cause analysis into `car_case_repository` for future retrieval.

### Internal Audit & Compliance Management System
- **Audit Scheduling & Planning:** Schedule internal audits by target ISO standard, scheduled date, lead auditor, department, and custom scope, progressing through `scheduled`, `in_progress`, and `completed` stages.
- **Dynamic ISO Checklist Template Builder:** Create, configure, and maintain reusable audit checklist templates with categorized sections, requirement descriptions, audit questions, and scoring criteria.
- **Interactive Live Audit Execution:** Real-time checklist run evaluation allowing auditors to grade individual checklist items (`Compliant`, `Non-Compliant`, `Opportunity for Improvement`, `Not Applicable`), enter auditor notes, and auto-save audit progress snapshots.
- **Contextual Historical Insights during Audits:** Live display of previously linked CARs and QDDRs per ISO clause directly within the checklist runner, giving auditors instant historical context on recurring non-conformances.
- **Automated CAR Escalation from Audit Findings:** Non-compliant audit results can spawn a linked Corrective Action Request (CAR) directly from the audit interface (`audit_schedule_id` and `audit_result_id`), ensuring immediate corrective accountability.
- **Audit Reports & Analytics:** Instant generation of comprehensive audit summary reports detailing overall conformance percentages, compliance breakdown by clause, total findings, and unresolved action items.
- **System Traceability & Immutable Audit Logs:** Centralized tracking under Document Control Center (DCC) logging every create, update, delete, login, status change, and VoE verification event to ensure full ISO 9001 compliance audit readiness.

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

The system features a highly intelligent **LLM-Augmented Case-Based Reasoning** engine (`server/services/suggestionService.js` and `server/utils/cbr.js`) to automatically retrieve and suggest the most historically effective corrective and preventive actions.

### Dual-Domain Case Repositories
- **CAR Case Repository (`car_case_repository`):** Dedicated to Non-Conformance Reports, Customer Complaints, and Internal/External Audits.
- **QDDR Case Repository (`qddr_case_repository`):** Dedicated to warehouse Quality Defects, Damaged stock, and Discrepancy write-off/disposition scenarios.

### Step 1: Semantic Feature Extraction & Structured RCA Input
Before retrieval, the system reads both the **Non-Conformance Details** and the structured **Root Cause Analysis (5 Whys, Fishbone 6M, or Both)** provided by the investigator. Root Cause Analysis is strictly human-authored to preserve quality accountability, serving as an essential feature vector for CBR matching rather than an AI-generated guess.

### Step 2: Composite Retrieval Scoring (Vector + Symbolic Overlap)
Candidate cases in the repository are scored using a composite multi-factor algorithm:
- **Cosine Vector Similarity (pgvector):** Evaluates semantic alignment between the current combined Non-conformance + RCA query embedding and stored case embeddings.
- **Lexical Keyword Jaccard Similarity:** Compares key technical terms across descriptions and past cases.
- **Root Cause Keyword Overlap:** Specifically rewards cases sharing identical 5 Whys causes or 6M Fishbone factors (*Man, Machine, Material, Method, Measurement, Environment*).
- **Historical Effectiveness Weighting:** Prioritizes past closed cases that achieved proven effectiveness during Verification of Effectiveness (VoE) audits.

### Step 3: Generative AI Fallback (RAG)
If the CBR engine detects a novel defect with no sufficiently close historical match, the system triggers a **Retrieval-Augmented Generation (RAG) Fallback** using Google Gemini. It injects the nearest partial cases along with the user's specific 5 Whys / Fishbone root cause into a structured prompt, producing targeted Immediate Corrective Action and long-term Preventive Action plans without guessing or overwriting the user's Root Cause Analysis.

## Advanced AI Architecture & Optimization

To ensure enterprise-grade scalability and strict cost management on zero-cost free tiers, QFlow utilizes a highly advanced **Hybrid Neuro-Symbolic** approach.

### 1. Model Routing Optimization
Instead of relying on a single heavy LLM for all tasks, workloads are decoupled based on frequency and reasoning requirements:
- **Background Tasks (Gemini 2.5 Flash-Lite):** High-frequency tasks like Pallet Label/Barcode scanning, Reason of Discrepancy synthesis from photos, Discrepancy Tag Auto-Classification, and CAPA suggestions are routed to Google's fastest model. This maximizes throughput and minimizes latency.
- **Conversational Chatbot (OpenRouter / GPT-4o-mini):** Low-frequency, high-reasoning tasks involving RAG, context memory, and data summarization are reserved for heavy reasoning models via the OpenRouter API.

### 2. Semantic Search & Vector Embeddings
To prevent API rate-limiting during Case-Based Reasoning, the system employs **True Vector Embeddings** as its primary engine:
1. **Vectorization:** Defect descriptions and structured Root Cause Analyses are converted into numerical vectors using Google's `text-embedding-004` model.
2. **Cosine Similarity:** These vectors are queried directly inside PostgreSQL using `pgvector` (`match_car_cases` and `match_qddr_cases` RPCs) to calculate cosine distance.
3. **Lexical Fallback (Jaccard):** If vector generation ever encounters network or rate limitations, the system automatically falls back to an offline Jaccard lexical search using extracted keywords, guaranteeing uninterrupted system uptime.

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
