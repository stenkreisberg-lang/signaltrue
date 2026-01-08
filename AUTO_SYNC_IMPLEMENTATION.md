# Auto-Sync Employee Implementation Summary

## ✅ Completed

### 1. **Employee Sync Service** (`backend/services/employeeSyncService.js`)
**Purpose**: Automatically sync employees from Slack/Google Workspace after IT admin completes OAuth

**Functions implemented:**
- `syncEmployeesFromSlack(orgId)` - Fetches all workspace members via Slack API
- `syncEmployeesFromGoogle(orgId)` - Fetches all workspace users via Google Directory API
- `getSyncStatus(orgId)` - Returns sync statistics for an organization

**Key Features:**
- Auto-creates "Unassigned" team for new synced employees
- Creates users with `accountStatus: 'pending'` (no password required)
- Updates existing users with external IDs and profile info
- Marks departed employees as `inactive`
- Stores external IDs (slackUserId, googleUserId) for linking
- Captures profile data (avatar, title, department, phone)
- Returns detailed stats: created, updated, skipped, inactivated, errors

---

### 2. **User Model Updates** (`backend/models/user.js`)
**Purpose**: Support auto-synced employees who haven't logged in yet

**New Fields Added:**
```javascript
accountStatus: {
  type: String,
  enum: ['pending', 'active', 'inactive'],
  default: 'active'
}
// pending = synced from external source, no password yet
// active = has set password, can log in
// inactive = left company or deactivated

source: {
  type: String,
  enum: ['manual', 'slack', 'google_chat', 'google_workspace', 'invitation'],
  default: 'manual'
}

externalIds: {
  slackUserId: String,
  googleUserId: String,
  slackTeamId: String,
  googleWorkspaceId: String
}

profile: {
  avatar: String,
  title: String,
  department: String,
  phone: String
}
```

**Critical Change:**
- Password now conditional: only required if `accountStatus === 'active'`
- Allows pending users to exist without passwords

---

### 3. **Integration OAuth Callbacks Updated** (`backend/routes/integrations.js`)
**Purpose**: Trigger employee sync automatically when IT admin connects integrations

**Slack OAuth Callback** (`/api/integrations/slack/oauth/callback`):
- After saving access token → calls `syncEmployeesFromSlack(orgId)` in background
- Stores teamId and teamName
- Logs sync results

**Google Chat OAuth Callback** (`/api/integrations/google-chat/oauth/callback`):
- After saving access token → calls `syncEmployeesFromGoogle(orgId)` in background
- Handles Directory API not enabled gracefully
- Logs sync results or warnings

---

### 4. **Employee Sync API Endpoints** (`backend/routes/employeeSync.js`)
**Purpose**: Allow HR/IT admins to manually trigger syncs and check status

**Endpoints:**
- `GET /api/employee-sync/status` - Get sync stats for organization
  - Returns: totalUsers, pendingUsers, activeUsers, unassignedUsers, lastSlackSync, lastGoogleSync
  - Available to: hr_admin, admin, master_admin

- `POST /api/employee-sync/slack` - Manually trigger Slack employee sync
  - Available to: hr_admin, it_admin, admin, master_admin

- `POST /api/employee-sync/google` - Manually trigger Google Workspace sync
  - Available to: hr_admin, it_admin, admin, master_admin

**Registered in `server.js`:**
```javascript
app.use("/api/employee-sync", employeeSyncRoutes);
```

---

### 5. **Organization Model Updates** (`backend/models/organizationModel.js`)
**Purpose**: Track when employee lists were last synced

**New Fields:**
```javascript
integrations: {
  slack: {
    // ... existing fields
    lastEmployeeSync: Date
  },
  googleChat: {
    // ... existing fields  
    lastEmployeeSync: Date
  }
}
```

---

## 🎯 How It Works

### New Employee Onboarding Flow:

1. **IT Admin connects Slack/Google** → Completes OAuth
2. **System auto-syncs employees** → Fetches all workspace members
3. **Creates pending users** → User records with no password required
4. **Assigns to "Unassigned" team** → Default team for new synced employees
5. **HR sees Employee Directory** → (Next: build UI component)
6. **HR assigns to teams** → Moves employees from "Unassigned" to proper teams
7. **Measurements start immediately** → No need for employee to log in
8. **Optional: Employee claims account** → Sets password, accountStatus becomes 'active'

---

## 📦 Dependencies Required

Add to `backend/package.json`:
```json
{
  "dependencies": {
    "@slack/web-api": "^7.0.0",
    "googleapis": "^140.0.0"
  }
}
```

Install:
```bash
cd backend
npm install @slack/web-api googleapis
```

---

## 🔐 Required OAuth Scopes

### Slack:
- Existing scopes are sufficient for basic sync
- For full profile data: add `users:read`, `users:read.email`

### Google Workspace:
- **Required**: Add this scope to your Google OAuth:
  ```
  https://www.googleapis.com/auth/admin.directory.user.readonly
  ```
- Enable **Admin SDK API** in Google Cloud Console
- Requires domain-wide delegation if using service account

---

## 🚧 Still TODO

### 1. **Employee Directory UI Component** (Priority: HIGH)
Create `src/components/EmployeeDirectory.tsx` with:
- List of all synced employees
- Filter: Assigned vs Unassigned
- Search by name/email
- Display: avatar, name, email, title, team (if any)
- Actions: Assign to team, View profile
- Show sync status & last sync time
- Manual sync trigger button

### 2. **Bulk Team Assignment Interface** (Priority: MEDIUM)
Enhance team assignment with:
- Multi-select employees
- Bulk assign to team
- Drag-and-drop interface
- CSV import for bulk assignments

### 3. **Periodic Sync Job** (Priority: LOW)
- Daily cron job to re-sync employees
- Detect new hires automatically
- Detect departures (mark inactive)
- Update profile changes

### 4. **Account Claiming Flow** (Priority: MEDIUM)
When pending employee wants to log in:
- Verify email
- Set password
- Change accountStatus from 'pending' to 'active'
- Send welcome email

---

## 🧪 Testing Instructions

### Test Slack Sync:
1. As IT admin, connect Slack integration
2. Check backend logs for: `[EmployeeSync] Slack sync complete`
3. Query database: `User.find({ source: 'slack', accountStatus: 'pending' })`
4. Verify "Unassigned" team created and populated

### Test Google Sync:
1. Ensure Admin SDK API enabled
2. Add directory scope to OAuth
3. As IT admin, connect Google Chat
4. Check logs for sync results or warnings
5. Query database for Google-synced users

### Test Manual Sync:
```bash
# Get sync status
curl -H "Authorization: Bearer YOUR_JWT" \
  http://localhost:8080/api/employee-sync/status

# Trigger Slack sync
curl -X POST -H "Authorization: Bearer YOUR_JWT" \
  http://localhost:8080/api/employee-sync/slack

# Trigger Google sync
curl -X POST -H "Authorization: Bearer YOUR_JWT" \
  http://localhost:8080/api/employee-sync/google
```

---

## 💡 Key Decisions Made

1. **Pending users don't need passwords** - Allows system to measure immediately
2. **"Unassigned" team as default** - Clear staging area for HR to process
3. **Background sync** - OAuth callback doesn't block, sync runs async
4. **Store external IDs** - Enables future updates and prevents duplicates
5. **Graceful Google Directory API handling** - System works even if API not enabled
6. **Manual trigger available** - HR/IT can re-sync anytime

---

## 🔄 Migration Notes

Existing users are NOT affected:
- accountStatus defaults to 'active'
- source defaults to 'manual'
- Password validation unchanged for existing users

---

## 📝 Environment Variables

No new environment variables required!
Uses existing:
- `SLACK_CLIENT_ID`, `SLACK_CLIENT_SECRET`
- `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET`

---

**Status**: ✅ Backend complete, ready for Employee Directory UI
**Next**: Build Employee Directory component for HR Admin dashboard
