## Purpose

This file gives actionable, repo-specific guidance for AI coding agents working on SignalTrue. Focus on small, safe edits: implement routes, update Mongoose models, fix frontend calls, and wire env-driven config.

## Quick start (dev)
- Frontend (Create React App):
  - From repo root: `npm install` then `npm start` (serves at http://localhost:3000).
- Backend (Express + Mongoose):
  - From `backend/`: `npm install` then `node server.js` (serves at http://localhost:8080 by default).
  - Provide `MONGO_URI` in `.env` if you want real DB connectivity. `PORT` can override 8080.

## Architecture overview
- Monorepo-like layout: frontend (root React app) + `backend/` (Express API).
- API is mounted in `backend/server.js` at `/api/projects` and implemented in `backend/routes/projects.js`.
- Data model: `backend/models/project.js` (Mongoose). Timestamps are enabled; schema fields: `name`, `description`, `favorite`.

## Key files to reference
- `backend/server.js` — Express app, CORS, JSON body parser, route mounting, optional MongoDB connect using `process.env.MONGO_URI`.
- `backend/routes/projects.js` — CRUD endpoints: POST /, GET /, PUT /:id, DELETE /:id. Uses async/await and try/catch; errors return 500 with `{ message }`.
- `backend/models/project.js` — Mongoose schema: { name, description, favorite } with timestamps.
- `package.json` (root) — CRA scripts for frontend; no proxy configured (so backend is expected at port 8080).

## API & data examples (use these exact shapes)
- Create project (POST): POST http://localhost:8080/api/projects
  - Body JSON: { "name": "My Project", "description": "Short description" }
- List projects (GET): GET http://localhost:8080/api/projects
- Update (PUT): PUT http://localhost:8080/api/projects/<id>
  - Body JSON may include { "name": "..", "description": "..", "favorite": true }
- Delete: DELETE http://localhost:8080/api/projects/<id>

## Project-specific patterns & conventions
- Backend uses ES modules (`import` / `export default`) — `backend/package.json` sets `type: "module"`.
- Route handlers consistently use async/await with try/catch and return HTTP 500 on exceptions.
- Models are single default exports (e.g., `export default mongoose.model(...)`).
- Routes and models live under `backend/routes/` and `backend/models/` respectively. Add new endpoints there.

## Developer workflows & gotchas
- There is no backend start script; run backend with `node server.js` or add a `start` script if needed.
- No proxy is set in the frontend CRA config — during dev the frontend must call the backend at `http://localhost:8080` (or add `proxy` to root `package.json`).
- Tests: default CRA test scaffolding exists in `src/` but backend has no tests.

## Safe edit guidance for agents
- When changing API behavior, update `backend/routes/*` and corresponding model in `backend/models/*`.
- Maintain the existing error pattern (500 + `{ message }`) unless asked to introduce richer error handling.
- Use named examples above when adding or modifying endpoints; ensure request/response JSON shapes match frontend expectations in `src/`.

## Where to look when things break
- If the server doesn't start: check `backend/server.js` for syntax errors and that `type: "module"` is in `backend/package.json`.
- If DB errors: verify `MONGO_URI` in `.env` and network connectivity.
- If frontend can't reach API: confirm backend running on port 8080 or add a `proxy` field in root `package.json`.

---
If anything here is unclear or you want the agents to follow a stricter pattern (e.g., add tests or change error responses), tell me what to add and I'll iterate.
