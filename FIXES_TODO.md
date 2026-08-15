# SignalTrue — Fix List

Prioritized list of issues found in code review. P0 = fix before next deploy, P1 = soon, P2 = cleanup.

---

## P0 — Critical

### 1. Cross-tenant data access (IDOR)
Many routes authenticate the user but never verify the requested `orgId`/`teamId` belongs to that user. Any logged-in customer can read another company's data by passing a different ID in the URL.

- **Where:** `routes/signals.js`, `routes/bdiRoutes.js` (also mounted at `/api/indices`, `/api/capacity`, `/api/timeline`, `/api/dashboard`, `/api/playbooks`), `routes/teamStateRoutes.js`, `routes/forecastRoutes.js`, `routes/focusRoutes.js`, `routes/narrativeRoutes.js`, `routes/outcomesRoutes.js`, `routes/resilienceRoutes.js`, `routes/benchmarks.js` (legacy `/team/:teamId` and `/org/:orgId`).
- **Fix:** Apply the existing `requireOrganizationAccess()` middleware (in `middleware/auth.js`) to every route taking `:orgId`. Add an equivalent team-ownership check for routes taking `:teamId` (resolve team → compare `team.orgId` to `req.user.orgId`, allow `isMasterAdmin`).
- **Reference (correct pattern):** `routes/actions.js` (`canAccessOrg`), `routes/reports.js`, `routes/organizations.js`.

### 2. OAuth tokens stored in plaintext (env var name mismatch)
`utils/crypto.js` reads the key from `SECRET_KEY` or `TOKEN_ENCRYPTION_KEY`, but `.env` only defines `ENCRYPTION_KEY` (and it's empty). With no key found, `encryptString()` silently returns plaintext. Google/Microsoft OAuth refresh tokens (org-wide calendar access) are written to the DB unencrypted.

- **Fix:** Set a real key under the name the code expects (`SECRET_KEY` or `TOKEN_ENCRYPTION_KEY`) — or rename the `.env` var / update `crypto.js` so they match. Generate with `openssl rand -hex 32`.
- **Fix:** Make encryption fail-closed in production — if no key is set and `NODE_ENV=production`, throw on startup instead of passing through plaintext.
- **Follow-up:** Re-encrypt any tokens already stored in plaintext (migration script).

---

## P1 — Important

### 3. Privacy gate default minimum team size is 1
`utils/privacyGate.js` sets `MIN_TEAM_SIZE = 1`. A one-person "team" passes the gate, so individual data can be shown — which contradicts the "no individual tracking / aggregation only" promise in `docs/what_we_do_not_do.md`.

- **Fix:** Raise the default to 3–5. Keep the per-org `settings.minTeamSize` override, but the floor should never drop below the marketed minimum.

### 4. Privacy gate returns HTTP 204 with a body (bug)
`middleware/privacyGate.js` does `res.status(204).json({ suppressed, minRequired, message })`. 204 = No Content; Express strips the body, so the client gets an empty response and never sees the suppression payload.

- **Fix:** Use `res.status(200)` (or `403`) instead of `204`.

### 5. Suspicious-activity detection is log-only
`detectSuspiciousActivity` in `middleware/security.js` detects SQLi / path-traversal / script-tag / command-injection patterns but the blocking line is commented out — it only logs.

- **Fix:** Decide whether to block (uncomment the 403) or keep as monitoring. If blocking, allow-list legitimate cases to avoid false positives. Note: it `JSON.stringify`s every request body on every request — minor overhead to be aware of.

### 6. Internal scoring token: weak comparison + fail-open
`routes/internalScoringRoutes.js` compares the service token with `!==` (not timing-safe) and, if `INTERNAL_SERVICE_TOKEN` is unset, calls `next()` in non-production (fail-open).

- **Fix:** Use `crypto.timingSafeEqual` for the comparison. Require the token in all environments, or at minimum guard the fail-open path more tightly.

### 7. Public analytics write endpoints unprotected
`POST /api/analytics` and `POST /api/analytics/track` (in `routes/analytics.js` and `server.js`) have no auth and no dedicated rate limit — the events collection can be spammed.

- **Fix:** Add a dedicated rate limiter and/or lightweight validation/origin check.

---

## P2 — Cleanup / quality

### 8. Jest test suite partially broken
42 tests pass, but 5 of 6 suites fail to run with "Cannot use import statement outside a module" — Jest isn't configured for the project's ESM setup. CI may report green while most suites never execute.

- **Fix:** Configure Jest for ESM (e.g. `NODE_OPTIONS=--experimental-vm-modules` + `transform: {}`, or babel-jest). Confirm all suites actually run in CI.

### 9. Dead / duplicate files
- `middleware/apiKey.js` is a deprecated stub (logic moved to `middleware/auth.js`) — remove.
- Duplicate `" 2"` files in the repo: `backend/package-lock 2.json`, `tests/dataReadinessFixes.test 2.js`, `scripts/fix-nobel-data-readiness 2.js`, `scripts/nobel-data-readiness-audit 2.js`, `.git/index 2`. Clean these up.
- Large number of overlapping `*.md` deployment/status docs at repo root — consider consolidating.

### 10. CORS allows all origins in non-production
`server.js` CORS callback allows any origin when `NODE_ENV !== 'production'`. Fine for dev, but make sure `NODE_ENV` is reliably set to `production` in the deployed environment.

---

## Quick verification checklist after fixes
- [ ] Attempt to read another org's `/api/signals/org/:orgId` with a normal user token → expect 403.
- [ ] Confirm stored OAuth tokens start with the `enc:gcm:` prefix in the DB.
- [ ] Confirm a 1-person team returns a suppression response (with body) and not raw data.
- [ ] `npx jest` runs all 6 suites (0 suites failing to load).
- [ ] `node --check` passes on all backend files (already passing).
