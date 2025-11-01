Deployment guide
----------------

This file contains quick steps to deploy the frontend and backend and connect to MongoDB Atlas.

1) Provision MongoDB Atlas
   - Create a free cluster on MongoDB Atlas.
   - Create a database user and note the connection string (MONGO_URI).

2) Deploy backend
   - Provider options: Render, Railway, Heroku.
   - Set the start command to `npm start` (already present in `backend/package.json`).
   - Add environment variable `MONGO_URI` with your Atlas connection string.
   - If the provider exposes a PORT, it will be used via `process.env.PORT`.

3) Deploy frontend
   - Provider options: Vercel or Netlify.
   - Build command: `npm run build` (from repo root).
   - Set an environment variable `REACT_APP_API_URL` to the backend base URL (for example `https://your-backend.onrender.com`).

4) CI (optional)
   - The repository contains a basic GitHub Actions workflow at `.github/workflows/ci.yml` that runs backend tests and builds the frontend.
   - For automatic deployments, connect your repo in the provider dashboard (Vercel / Render) and configure environment variables there.

Notes
-----
- The frontend uses `process.env.REACT_APP_API_URL` (CRA env var) to determine the API base URL. If not set, it falls back to `http://localhost:8080`.
- The backend uses `process.env.MONGO_URI` for DB connectivity.
- For production, secure your Atlas user and whitelist the deployment provider IPs or use the cloud provider integration.

Repository secrets required for CI/deploy workflows
-------------------------------------------------
- For Vercel deployment (frontend):
   - `VERCEL_TOKEN`
   - `VERCEL_ORG_ID`
   - `VERCEL_PROJECT_ID`
- For Render deployment (backend):
   - `RENDER_API_KEY`
   - `RENDER_SERVICE_ID`
- For production DB:
   - `MONGO_URI` (MongoDB Atlas connection string)

Set these in the GitHub repository Settings → Secrets before enabling the workflows.
