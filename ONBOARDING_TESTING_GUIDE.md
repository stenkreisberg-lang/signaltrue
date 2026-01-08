# Role-Based Onboarding - Testing Guide

## 🧪 Manual Testing Checklist

### Prerequisites
- [ ] Backend running on `http://localhost:8080`
- [ ] Frontend running on `http://localhost:3000`
- [ ] MongoDB connected
- [ ] RESEND_API_KEY configured in backend .env
- [ ] Clear browser localStorage before testing

---

## Test Suite 1: HR Admin Path (Invite IT Admin)

### 1.1 HR Admin Registration
**Steps:**
1. Navigate to http://localhost:3000/register
2. Fill in:
   - Name: "HR Manager"
   - Email: "hr@testcompany.com"
   - Password: "password123"
3. Click "Sign Up"

**Expected:**
- ✅ Account created successfully
- ✅ Auto-logged in
- ✅ Redirected to `/dashboard`
- ✅ See HRAdminOnboarding screen (not regular dashboard)
- ✅ See welcome message with organization name
- ✅ See two options: "Invite IT Admin" and "Set Up Myself"

**Backend Check:**
```bash
# In MongoDB, verify user document:
db.users.findOne({ email: "hr@testcompany.com" })
# Should have role: "hr_admin"
```

---

### 1.2 Invite IT Admin
**Steps:**
1. On HRAdminOnboarding screen, click "Invite IT Admin" button
2. Form should expand
3. Fill in:
   - IT Admin Name: "Tech Lead"
   - IT Admin Email: "it@testcompany.com"
4. Click "Send Invitation"

**Expected:**
- ✅ Form submits successfully
- ✅ Green success banner appears: "✅ Invitation sent successfully!"
- ✅ Form resets and closes after 3 seconds

**Backend Check:**
```bash
# Check backend logs for Resend email:
# Should see: "Invitation email sent to it@testcompany.com"

# Check MongoDB invitations:
db.invitations.findOne({ email: "it@testcompany.com" })
# Should have:
#   role: "it_admin"
#   status: "pending"
#   token: "eyJ..." (JWT)
```

**Email Check:**
- Check the email inbox for it@testcompany.com
- Or check backend logs for the invitation URL
- URL format: `http://localhost:3000/onboarding?token=eyJ...`

---

### 1.3 HR Admin Still Blocked
**Steps:**
1. While still logged in as HR admin
2. Try refreshing the page

**Expected:**
- ✅ Still see HRAdminOnboarding screen
- ✅ Cannot see team data yet
- ✅ Message indicates IT admin needs to complete setup

---

## Test Suite 2: IT Admin Path (Accept & Setup)

### 2.1 Accept Invitation
**Steps:**
1. Open new incognito window
2. Copy invitation URL from email or backend logs
3. Paste into browser: `http://localhost:3000/onboarding?token=eyJ...`
4. Should see AcceptInvitation page
5. Fill in:
   - Name: "Tech Lead"
   - Password: "techpass123"
   - Confirm Password: "techpass123"
6. Click "Accept Invitation"

**Expected:**
- ✅ Form submits successfully
- ✅ Auto-logged in as IT admin
- ✅ Redirected to `/dashboard?onboarding=integrations`
- ✅ See ITAdminOnboarding wizard (not regular dashboard)

**Backend Check:**
```bash
# Check user created:
db.users.findOne({ email: "it@testcompany.com" })
# Should have role: "it_admin"

# Check invitation accepted:
db.invitations.findOne({ email: "it@testcompany.com" })
# Should have status: "accepted"
```

---

### 2.2 Integration Setup Wizard
**Steps:**
1. Should see ITAdminOnboarding wizard
2. Verify UI elements:
   - Progress bar showing 0%
   - Step 1: Connect Chat Platform
   - Step 2: Connect Calendar
   - Both steps showing "Not connected"

**Expected:**
- ✅ Wizard UI displays correctly
- ✅ Progress bar at 0%
- ✅ Integration buttons visible
- ✅ Privacy notice displayed at bottom

---

### 2.3 Connect Slack (Step 1)
**Steps:**
1. Click "Slack" button
2. Should redirect to Slack OAuth
3. (In development, you may not have full OAuth - check that redirect happens)
4. After OAuth completes, return to wizard

**Expected:**
- ✅ Redirected to Slack OAuth URL
- ✅ After completion, Slack card shows "Connected"
- ✅ Progress bar updates to 50%
- ✅ Step 1 shows green checkmark ✓

**Note:** If you don't have Slack OAuth configured:
- The button should still trigger OAuth flow
- You can manually update MongoDB to simulate:
```bash
db.organizations.updateOne(
  { _id: ObjectId("...") },
  { $set: { "integrations.slack.accessToken": "fake-token-for-testing" } }
)
```
Then refresh page to see progress update.

---

### 2.4 Connect Google Calendar (Step 2)
**Steps:**
1. Click "Google Calendar" button
2. Complete OAuth flow
3. Return to wizard

**Expected:**
- ✅ Calendar card shows "Connected"
- ✅ Progress bar updates to 100%
- ✅ Step 2 shows green checkmark ✓
- ✅ Success screen appears automatically

**Simulate in MongoDB:**
```bash
db.organizations.updateOne(
  { _id: ObjectId("...") },
  { $set: { 
    "integrations.google.accessToken": "fake-token",
    "integrations.google.scope": "calendar"
  }}
)
```

---

### 2.5 Setup Complete Screen
**Steps:**
1. After both integrations connected
2. Should automatically show success screen

**Expected:**
- ✅ See 🎉 celebration icon
- ✅ Title: "Setup Complete!"
- ✅ Green success box with checkmarks:
   - ✓ Slack connected (or Google Chat)
   - ✓ Calendar connected
   - ✓ First analysis running in background
- ✅ "View Dashboard" button visible

---

## Test Suite 3: HR Admin Can Now View Data

### 3.1 HR Admin Sees Full Dashboard
**Steps:**
1. Switch back to HR admin window (or re-login)
2. Navigate to `/dashboard`
3. Refresh page if needed

**Expected:**
- ✅ No longer sees HRAdminOnboarding screen
- ✅ Sees full Dashboard.js component
- ✅ Integration cards show as connected
- ✅ Can view team data, analytics, insights
- ✅ Sees team members list
- ✅ Can access all dashboard features

**Verify:**
```bash
# GET /api/onboarding/status as HR admin should return:
{
  "role": "hr_admin",
  "integrationsComplete": true,
  "requirements": {
    "canViewData": true,
    "nextStep": "view_dashboard"
  }
}
```

---

## Test Suite 4: Alternative Path (HR Sets Up Self)

### 4.1 HR Chooses "Set Up Myself"
**Steps:**
1. Register new HR admin with different email
2. On HRAdminOnboarding screen, click "Set Up Myself"

**Expected:**
- ✅ Redirected to regular Dashboard.js
- ✅ See integration cards (Slack, Calendar, etc.)
- ✅ Can manually connect integrations
- ✅ No IT admin needed

---

## Test Suite 5: Edge Cases

### 5.1 IT Admin Returns After Setup
**Steps:**
1. IT admin logs out
2. Logs back in
3. Navigates to `/dashboard`

**Expected:**
- ✅ Does NOT see setup wizard again
- ✅ Sees regular Dashboard
- ✅ Can view integrations status

---

### 5.2 Invalid Invitation Token
**Steps:**
1. Navigate to `/onboarding?token=invalid-token`
2. Try to submit form

**Expected:**
- ✅ Error message displayed
- ✅ User not created
- ✅ Helpful error message

---

### 5.3 Expired Invitation
**Steps:**
1. Create invitation
2. Manually expire it in database:
```bash
db.invitations.updateOne(
  { email: "test@test.com" },
  { $set: { expiresAt: new Date('2020-01-01') } }
)
```
3. Try to accept invitation

**Expected:**
- ✅ Error: "Invitation expired"
- ✅ User cannot complete registration

---

### 5.4 Second User Registers (Not First)
**Steps:**
1. After HR admin exists
2. New user registers directly (not via invitation)

**Expected:**
- ✅ New user gets "viewer" role (not hr_admin)
- ✅ Or if invited via standard flow, gets assigned role from invitation

---

## Test Suite 6: Role Permissions

### 6.1 IT Admin Cannot Invite Others
**Steps:**
1. Log in as IT admin
2. Try to access invitation features

**Expected:**
- ✅ IT admin should not see "Invite" buttons
- ✅ POST /api/onboarding/invitations should return 403 if IT admin tries

---

### 6.2 Non-Admin Cannot Access Onboarding Routes
**Steps:**
1. Create user with role "viewer"
2. Try to POST /api/onboarding/invitations

**Expected:**
- ✅ 403 Forbidden error
- ✅ Only hr_admin, admin, master_admin can invite

---

## Test Suite 7: API Endpoint Testing

### 7.1 GET /api/onboarding/status
**Test:**
```bash
curl -X GET http://localhost:8080/api/onboarding/status \
  -H "Authorization: Bearer <token>"
```

**Expected Response:**
```json
{
  "role": "hr_admin",
  "orgId": "...",
  "orgName": "Test Company",
  "isFirstUser": true,
  "requirements": {
    "canInviteITAdmin": true,
    "canViewData": false,
    "mustInviteITAdmin": true,
    "nextStep": "invite_it_admin_or_connect_integrations"
  },
  "slackConnected": false,
  "googleChatConnected": false,
  "chatConnected": false,
  "calendarConnected": false,
  "integrationsComplete": false
}
```

---

### 7.2 POST /api/onboarding/invitations
**Test:**
```bash
curl -X POST http://localhost:8080/api/onboarding/invitations \
  -H "Authorization: Bearer <hr-token>" \
  -H "Content-Type: application/json" \
  -d '{
    "email": "it@test.com",
    "name": "IT Admin",
    "role": "it_admin"
  }'
```

**Expected Response:**
```json
{
  "invitation": {
    "_id": "...",
    "email": "it@test.com",
    "role": "it_admin",
    "status": "pending",
    "token": "eyJ..."
  },
  "inviteUrl": "http://localhost:3000/onboarding?token=eyJ..."
}
```

---

### 7.3 POST /api/onboarding/accept
**Test:**
```bash
curl -X POST http://localhost:8080/api/onboarding/accept \
  -H "Content-Type: application/json" \
  -d '{
    "token": "eyJ...",
    "name": "Tech Lead",
    "password": "password123"
  }'
```

**Expected Response:**
```json
{
  "token": "eyJ...",
  "user": {
    "_id": "...",
    "email": "it@test.com",
    "name": "Tech Lead",
    "role": "it_admin",
    "orgId": "...",
    "teamId": "..."
  },
  "orgId": "...",
  "teamId": "..."
}
```

---

## 🐛 Common Issues & Solutions

### Issue: "Cannot find module '../components/onboarding/ITAdminOnboarding'"
**Solution:** TypeScript cache issue. Restart dev server:
```bash
# Stop frontend
# Then:
npm start
```

---

### Issue: Email not sending
**Solution:** Check backend .env:
```bash
# Must have:
RESEND_API_KEY=re_xxxxx

# Check backend logs for Resend errors
```

---

### Issue: OAuth redirects fail
**Solution:** Check OAuth redirect URLs in Slack/Google Console:
```
Allowed redirects should include:
http://localhost:8080/api/oauth/slack/callback
http://localhost:8080/api/integrations/google-chat/callback
http://localhost:8080/api/oauth/google/callback
```

---

### Issue: Always shows onboarding screen
**Solution:** Check integration status:
```bash
# In MongoDB:
db.organizations.findOne({ _id: ObjectId("...") })

# Verify integrations object has:
{
  integrations: {
    slack: { accessToken: "..." },
    google: { accessToken: "...", scope: "calendar" }
  }
}
```

---

## ✅ Final Verification Checklist

After completing all tests:

- [ ] HR admin can register and is assigned hr_admin role
- [ ] HR admin sees onboarding screen (not dashboard)
- [ ] HR admin can send invitation email
- [ ] IT admin receives invitation email
- [ ] IT admin can click link and accept invitation
- [ ] IT admin sees setup wizard
- [ ] IT admin can connect integrations
- [ ] Progress bar updates correctly (0% → 50% → 100%)
- [ ] Success screen appears after completion
- [ ] HR admin can now see full dashboard with data
- [ ] IT admin can view dashboard after setup
- [ ] No errors in browser console
- [ ] No errors in backend logs
- [ ] All API endpoints respond correctly
- [ ] Role permissions enforced (IT cannot invite, etc.)

---

**Testing Date**: _____________  
**Tester**: _____________  
**Status**: ☐ Pass ☐ Fail  
**Notes**: _____________________________________________
