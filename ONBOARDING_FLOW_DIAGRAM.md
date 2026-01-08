# SignalTrue Onboarding Flow - Visual Guide

## 🎯 Complete User Journey Map

```
┌─────────────────────────────────────────────────────────────────────┐
│                    NEW USER VISITS SIGNALTRUE                        │
└─────────────────────────────────────────────────────────────────────┘
                              ↓
                    Clicks "Get Started"
                              ↓
                    ┌─────────────────┐
                    │  /register page │
                    └─────────────────┘
                              ↓
                Enters: Name, Email, Password
                              ↓
                    Backend Logic:
                    - Count users in org
                    - If count === 0 → role = "hr_admin"
                    - Else → role = "viewer" or invited role
                              ↓
                    ┌─────────────────┐
                    │  Auto-login &   │
                    │  Navigate →     │
                    │  /dashboard     │
                    └─────────────────┘
                              ↓
                    ┌─────────────────┐
                    │ DashboardRouter │
                    │  Component      │
                    └─────────────────┘
                              ↓
            Fetches: GET /api/onboarding/status
                              ↓
        ┌─────────────────────┴─────────────────────┐
        ↓                                           ↓
┌───────────────┐                          ┌────────────────┐
│   hr_admin    │                          │   it_admin     │
│               │                          │                │
│ isFirstUser=  │                          │ From invite    │
│    true       │                          │    email       │
└───────────────┘                          └────────────────┘
        ↓                                           ↓
integrationsComplete?                      integrationsComplete?
        │                                           │
    NO  │  YES                                  NO  │  YES
        ↓                                           ↓
┌───────────────┐                          ┌────────────────┐
│ HRAdminOn-    │                          │ ITAdminOn-     │
│ boarding      │                          │ boarding       │
│ Component     │                          │ Component      │
└───────────────┘                          └────────────────┘
        │                                           │
        ↓                                           ↓
┌───────────────┐                          ┌────────────────┐
│ Show 2 cards: │                          │ Setup Wizard:  │
│               │                          │                │
│ 1. Invite IT  │                          │ □ Step 1:      │
│    Admin ✓    │                          │   Connect Chat │
│               │                          │   (Slack or    │
│ 2. Set up     │                          │   Google Chat) │
│    myself     │                          │                │
└───────────────┘                          │ □ Step 2:      │
        │                                  │   Connect Cal  │
        │                                  │   (Google or   │
    User chooses                           │   Outlook)     │
        │                                  └────────────────┘
        ↓                                           │
┌───────────────────────────────┐                  ↓
│ Option A: Invite IT Admin     │         User connects both
│                               │         integrations
│ 1. HR enters IT email + name  │                  │
│                               │                  ↓
│ 2. POST /api/onboarding/      │         ┌────────────────┐
│    invitations                │         │ Success Screen │
│                               │         │                │
│ 3. Resend sends email:        │         │ ✓ Chat ready   │
│    Subject: "You're invited"  │         │ ✓ Calendar ok  │
│    Body: Beautiful HTML       │         │ ✓ Analysis on  │
│    Link: /onboarding?token=X  │         │                │
│                               │         │ [View Dash]    │
└───────────────────────────────┘         └────────────────┘
        │                                           │
        ↓                                           ↓
┌───────────────────────────────┐         ┌────────────────┐
│ IT Admin clicks email link    │         │ HR Admin sees  │
│                               │         │ FULL DASHBOARD │
│ Opens: /onboarding?token=XXX  │         │ with team data │
│                               │         └────────────────┘
│ AcceptInvitation page shows   │
│                               │
│ Form:                         │
│  - Name: [________]           │
│  - Password: [________]       │
│  - Confirm: [________]        │
│  [Accept Invitation]          │
└───────────────────────────────┘
        │
        ↓
POST /api/onboarding/accept
  { token, name, password }
        │
        ↓
┌───────────────────────────────┐
│ Auto-login + Navigate to      │
│ /dashboard?onboarding=        │
│   integrations                │
└───────────────────────────────┘
        │
        ↓
    (loops back to IT Admin flow above)
```

---

## 🔄 Alternative Path: HR Sets Up Themselves

```
┌───────────────────────────────┐
│ Option B: Set Up Myself       │
│                               │
│ HR clicks "Continue to Setup" │
│                               │
│ Navigate: /dashboard          │
└───────────────────────────────┘
        ↓
┌───────────────────────────────┐
│ DashboardRouter sees:         │
│ - role: hr_admin              │
│ - integrationsComplete: false │
│                               │
│ BUT user came from direct     │
│ navigation (not invitation)   │
└───────────────────────────────┘
        ↓
┌───────────────────────────────┐
│ Shows: Regular Dashboard.js   │
│ Component                     │
│                               │
│ Integration cards visible:    │
│ - Connect Slack               │
│ - Connect Google Chat         │
│ - Connect Calendar            │
│ - Connect Outlook             │
└───────────────────────────────┘
        ↓
HR manually connects integrations
        ↓
After both connected:
  integrationsComplete = true
        ↓
Can now view team data & insights
```

---

## 📧 Email Journey

```
┌───────────────────────────────────────────────┐
│  Resend Email Template                        │
├───────────────────────────────────────────────┤
│                                               │
│  [SignalTrue Logo]                            │
│                                               │
│  Hi [IT Admin Name],                          │
│                                               │
│  You've been invited to set up SignalTrue     │
│  for [Organization Name].                     │
│                                               │
│  As the IT admin, you'll connect the team's   │
│  collaboration tools (Slack/Google Chat +     │
│  Calendar) so HR can monitor team health.     │
│                                               │
│  ┌───────────────────────────────────────┐   │
│  │  [Accept Invitation & Set Up Tools]   │   │
│  └───────────────────────────────────────┘   │
│  (Button links to: /onboarding?token=XXX)     │
│                                               │
│  Or copy this link:                           │
│  https://app.signaltrue.com/onboarding?...    │
│                                               │
│  This invitation expires in 7 days.           │
│                                               │
│  Need help? support@signaltrue.com            │
│                                               │
│  —The SignalTrue Team                         │
└───────────────────────────────────────────────┘
```

---

## 🎨 UI State Diagram

```
                    ┌─────────────────┐
                    │  Landing Page   │
                    │  (Marketing)    │
                    └─────────────────┘
                            ↓
            ┌───────────────┴───────────────┐
            ↓                               ↓
    ┌──────────────┐              ┌──────────────┐
    │ /login       │              │ /register    │
    │              │              │              │
    │ [Email]      │              │ [Name]       │
    │ [Password]   │              │ [Email]      │
    │              │              │ [Password]   │
    │ [Login]      │              │              │
    └──────────────┘              │ [Sign Up]    │
            ↓                     └──────────────┘
            └───────────────┬───────────┘
                            ↓
                    /dashboard (route)
                            ↓
                    ┌─────────────────┐
                    │ DashboardRouter │
                    │   (Smart)       │
                    └─────────────────┘
                            ↓
        ┌───────────────────┼───────────────────┐
        ↓                   ↓                   ↓
┌──────────────┐  ┌──────────────┐  ┌──────────────┐
│ HRAdminOn-   │  │ ITAdminOn-   │  │ Full         │
│ boarding     │  │ boarding     │  │ Dashboard    │
│              │  │              │  │              │
│ State:       │  │ State:       │  │ State:       │
│ - hr_admin   │  │ - it_admin   │  │ - admin      │
│ - !complete  │  │ - !complete  │  │ - complete   │
│              │  │              │  │              │
│ [Invite]     │  │ [Connect]    │  │ [Analytics]  │
│ [Setup]      │  │ [Slack]      │  │ [Teams]      │
│              │  │ [Calendar]   │  │ [Insights]   │
└──────────────┘  └──────────────┘  └──────────────┘
```

---

## 🧩 Component Tree

```
App.tsx
  └─ BrowserRouter
      └─ Routes
          ├─ / → Index (marketing)
          ├─ /login → Login
          ├─ /register → Register
          ├─ /onboarding → AcceptInvitation
          │                └─ Form (name, password)
          │                └─ POST /accept
          │                └─ Navigate(/dashboard?onboarding=integrations)
          │
          └─ /dashboard → DashboardRouter
                            │
                            ├─ Fetch /api/onboarding/status
                            │
                            └─ Route based on role + status:
                                │
                                ├─ hr_admin + !complete
                                │   └─ HRAdminOnboarding
                                │       ├─ Welcome message
                                │       ├─ Option A: Invite IT
                                │       │   └─ Form (email, name)
                                │       │   └─ POST /invitations
                                │       └─ Option B: Setup myself
                                │           └─ Link to Dashboard
                                │
                                ├─ it_admin + !complete
                                │   └─ ITAdminOnboarding
                                │       ├─ Progress bar
                                │       ├─ Step 1: Chat
                                │       │   ├─ Slack button
                                │       │   └─ Google Chat button
                                │       ├─ Step 2: Calendar
                                │       │   ├─ Google Cal button
                                │       │   └─ Outlook button
                                │       └─ Success screen
                                │
                                └─ * (all other cases)
                                    └─ Dashboard.js (regular)
                                        ├─ Integration cards
                                        ├─ Team members
                                        ├─ Drift alerts
                                        └─ Analytics
```

---

## 📊 Data Flow

```
Component Request Flow:
━━━━━━━━━━━━━━━━━━━━━━━

1. DashboardRouter mounts
   ↓
2. useEffect fires
   ↓
3. GET /api/onboarding/status
   Headers: { Authorization: Bearer <token> }
   ↓
4. Backend (onboarding.js):
   - authenticateToken middleware
   - Extract userId, orgId, role from JWT
   - Fetch Organization document
   - Check integrations: slack, googleChat, calendar
   - Count users in org (isFirstUser check)
   - Build roleRequirements object
   ↓
5. Response:
   {
     role: "hr_admin",
     orgId: "...",
     orgName: "Acme Corp",
     isFirstUser: true,
     requirements: { ... },
     slackConnected: false,
     chatConnected: false,
     calendarConnected: false,
     integrationsComplete: false
   }
   ↓
6. DashboardRouter state updates
   ↓
7. Conditional render based on role + integrationsComplete
   ↓
8. Show appropriate component
```

---

## 🔐 Security Flow

```
Invitation Security Chain:
━━━━━━━━━━━━━━━━━━━━━━━

1. HR clicks "Invite IT Admin"
   ↓
2. POST /api/onboarding/invitations
   Body: { email, name, role: "it_admin" }
   Headers: { Authorization: Bearer <hr-token> }
   ↓
3. Backend validates:
   - HR has valid token ✓
   - HR has hr_admin role ✓
   - Email format valid ✓
   ↓
4. Create Invitation document:
   {
     orgId: <hr-org-id>,
     email: "it@company.com",
     role: "it_admin",
     invitedBy: <hr-user-id>,
     token: jwt.sign({ invitationId, orgId, email, role }, SECRET, { expiresIn: '7d' }),
     status: "pending",
     expiresAt: Date.now() + 7 days
   }
   ↓
5. Send email via Resend:
   To: it@company.com
   Link: /onboarding?token=<jwt-token>
   ↓
6. IT admin clicks link
   ↓
7. AcceptInvitation page:
   - Reads ?token from URL
   - Shows form
   ↓
8. POST /api/onboarding/accept
   Body: { token, name, password }
   ↓
9. Backend validates:
   - JWT signature valid ✓
   - JWT not expired ✓
   - Invitation status = "pending" ✓
   - Email matches token ✓
   ↓
10. Create User:
    {
      email: <from-token>,
      name: <from-form>,
      password: bcrypt(password),
      role: "it_admin",
      orgId: <from-token>,
      teamId: <default-team>
    }
    ↓
11. Update Invitation:
    status: "accepted"
    acceptedAt: Date.now()
    ↓
12. Return auth token:
    {
      token: jwt.sign({ userId, orgId, role }, SECRET),
      user: { ... }
    }
    ↓
13. Frontend stores token + redirects
```

---

## 📈 State Transitions

```
HR Admin States:
━━━━━━━━━━━━━━━

State A: Just Registered
  - role: hr_admin
  - isFirstUser: true
  - integrationsComplete: false
  → Shows: HRAdminOnboarding

State B: Invited IT Admin
  - role: hr_admin
  - isFirstUser: true (still only 1 accepted user)
  - integrationsComplete: false
  → Shows: HRAdminOnboarding (same, waiting state)

State C: IT Completed Setup
  - role: hr_admin
  - integrationsComplete: true
  → Shows: Full Dashboard


IT Admin States:
━━━━━━━━━━━━━━━

State A: Just Accepted Invitation
  - role: it_admin
  - integrationsComplete: false
  - URL: ?onboarding=integrations
  → Shows: ITAdminOnboarding (setup wizard)

State B: Connected Chat Only
  - role: it_admin
  - chatConnected: true
  - calendarConnected: false
  - integrationsComplete: false
  → Shows: ITAdminOnboarding (50% progress)

State C: All Integrations Complete
  - role: it_admin
  - integrationsComplete: true
  → Shows: ITAdminOnboarding (success screen)

State D: Returns Later
  - role: it_admin
  - integrationsComplete: true
  - No onboarding param
  → Shows: Full Dashboard
```

---

**Created**: January 8, 2026  
**Status**: Reference Documentation  
**Use**: Developer onboarding, debugging flows, QA testing
