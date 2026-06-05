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

- Centralized system logging: backend endpoints under `/api/logs` write to `system_logs` and `system_log_reads`. System logs are intended for admin viewing only.
- Audit helpers consolidated on the server for consistent, single-source logging of create/delete operations.
- Login/Logout audit events are recorded, but login is now recorded only once per browser session (prevents duplicates when switching tabs).
- Inactivity auto-logout: the client implements an inactivity timer (default 30 minutes) with a pre-timeout warning. The timer and warning are implemented in the frontend; see [src/App.jsx](src/App.jsx) to adjust durations or UI behavior.
- ISO Clause association and AI-based clause suggestions are available on **CAR reports** (via `CARModal`). The NCR submission modal (`CreateReportModal`) does **not** include clause selection or auto-suggest — those fields were intentionally removed to keep the NCR form focused.


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
