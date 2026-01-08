# Google Chat Integration Guide

## Overview

SignalTrue's Google Chat integration analyzes team communication patterns with the **same logic as Slack**, plus detection of ad-hoc meetings initiated through Google Meet links.

---

## What Gets Measured

### 1. **Message Patterns** (Same as Slack)
- **Message count**: Total messages in the space/room
- **Response times**: Average delay between messages from different users
- **After-hours activity**: Messages sent before 8am or after 6pm
- **Thread depth**: How often conversations happen in threads vs. main channel
- **Sentiment analysis**: AI-powered sentiment scoring (-1 to +1)

### 2. **Ad-Hoc Meeting Detection** (Google Chat Specific)
- **Google Meet links**: Detects when someone shares a `meet.google.com/xxx` link
- **New meetings only**: Only counts first occurrence of a Meet link in a thread
- **After-hours meetings**: Flags meetings started before 8am or after 6pm
- **Estimated duration**: Assumes 30 minutes per ad-hoc meeting
- **Meeting hours**: Adds to total meeting load for the team

### 3. **Metrics Calculated**
All metrics use the **exact same formulas as Slack**:
- Average response delay (hours)
- After-hours percentage
- Thread depth ratio
- Ad-hoc meeting count
- Estimated meeting hours from chat-initiated calls
- BDI (Behavioral Drift Index) impact

---

## Setup Instructions

### Step 1: Enable Google Chat API

1. Go to [Google Cloud Console](https://console.cloud.google.com)
2. Select your project (or create a new one)
3. Navigate to **APIs & Services** → **Library**
4. Search for and enable:
   - **Google Chat API**
   - **Google Workspace Admin SDK** (optional, for advanced features)

### Step 2: Configure OAuth Consent Screen

1. Go to **APIs & Services** → **OAuth consent screen**
2. Choose **Internal** (for Google Workspace) or **External**
3. Fill in app information:
   - App name: `SignalTrue`
   - Support email: Your admin email
   - Authorized domains: `signaltrue.ai`
4. Add scopes:
   ```
   https://www.googleapis.com/auth/chat.messages.readonly
   https://www.googleapis.com/auth/chat.spaces.readonly
   ```
5. Save and continue

### Step 3: Create OAuth Credentials

1. Go to **APIs & Services** → **Credentials**
2. Click **Create Credentials** → **OAuth client ID**
3. Application type: **Web application**
4. Name: `SignalTrue Google Chat`
5. Authorized redirect URIs:
   ```
   https://api.signaltrue.ai/api/integrations/google-chat/oauth/callback
   http://localhost:8080/api/integrations/google-chat/oauth/callback
   ```
6. Click **Create**
7. Copy **Client ID** and **Client Secret**

### Step 4: Add Environment Variables

Add to your `.env` file (backend):

```bash
# Google OAuth (shared with Calendar integration)
GOOGLE_CLIENT_ID=your_client_id_here
GOOGLE_CLIENT_SECRET=your_client_secret_here

# Google Chat specific redirect
GOOGLE_CHAT_REDIRECT_URI=https://api.signaltrue.ai/api/integrations/google-chat/oauth/callback
```

### Step 5: Connect in SignalTrue

1. Log in to SignalTrue dashboard
2. Navigate to integrations section
3. Click **Connect Google Chat**
4. Authorize the OAuth flow
5. Grant permissions for reading messages and spaces

---

## How It Works

### Data Collection

1. **OAuth Connection**: User authorizes SignalTrue to read Google Chat data
2. **Space Discovery**: Backend fetches list of available spaces/rooms
3. **Team Association**: Admin maps each team to a specific Google Chat space
4. **Scheduled Sync**: Every hour (or on-demand), the system:
   - Fetches last 7 days of messages from each space
   - Analyzes message patterns
   - Detects Google Meet links for ad-hoc meetings
   - Calculates metrics
   - Updates team BDI (Behavioral Drift Index)

### Ad-Hoc Meeting Detection Logic

```javascript
// Detects meet.google.com links
const meetPattern = /meet\.google\.com\/[a-z-]+/gi;

// For each message with a Meet link:
1. Check if it's the FIRST mention in the thread
2. Record timestamp
3. Check if after-hours (before 8am or after 6pm)
4. Estimate 30 minutes duration
5. Add to team's meeting load
```

### Privacy & Security

✅ **What we collect**:
- Message timestamps (not content)
- Sender IDs (anonymized in reports)
- Thread structure
- Google Meet links
- Response timing metadata

❌ **What we DON'T collect**:
- Message content (except for sentiment analysis, then discarded)
- Individual user names in reports
- File attachments
- Private DMs
- Calendar event details beyond public metadata

---

## API Endpoints

### List Available Spaces
```
GET /api/google-chat/spaces/:orgId
Authorization: Bearer <token>

Response:
{
  "spaces": [
    {
      "name": "spaces/AAAA1234",
      "displayName": "Engineering Team",
      "type": "ROOM"
    }
  ]
}
```

### Analyze a Space (Preview)
```
POST /api/google-chat/analyze/:spaceId
Authorization: Bearer <token>
Body: { "orgId": "..." }

Response:
{
  "messageCount": 342,
  "avgResponseDelayHours": 1.2,
  "afterHoursCount": 45,
  "afterHoursPercentage": 13,
  "avgThreadDepth": 0.28,
  "sentiment": 0.65,
  "adHocMeetings": {
    "adHocMeetingCount": 8,
    "estimatedMeetingHours": 4.0,
    "afterHoursMeetings": 2,
    "meetLinks": [...]
  }
}
```

### Associate Team with Space
```
PUT /api/teams/:teamId/google-chat-space
Authorization: Bearer <token>
Body: { "spaceId": "spaces/AAAA1234" }

Response:
{
  "_id": "team123",
  "name": "Engineering",
  "googleChatSpaceId": "spaces/AAAA1234",
  ...
}
```

### Manual Refresh
```
POST /api/google-chat/refresh
Authorization: Bearer <token>

Response:
{
  "ok": true,
  "updated": 5,
  "total": 5
}
```

---

## Comparison: Google Chat vs Slack

| Metric | Google Chat | Slack | Notes |
|--------|-------------|-------|-------|
| **Message count** | ✅ Same | ✅ Same | Total messages in 7 days |
| **Response times** | ✅ Same | ✅ Same | Avg delay between users |
| **After-hours activity** | ✅ Same | ✅ Same | Before 8am / after 6pm |
| **Thread depth** | ✅ Same | ✅ Same | % of threaded messages |
| **Sentiment analysis** | ✅ Same | ✅ Same | AI-powered, -1 to +1 |
| **Ad-hoc meetings** | ✅ **Enhanced** | ❌ Limited | Detects Meet links |
| **Meeting estimation** | ✅ **New** | ❌ No | 30min per Meet link |
| **BDI calculation** | ✅ Same | ✅ Same | Identical formula |

---

## OAuth Scopes Required

```
https://www.googleapis.com/auth/chat.messages.readonly
https://www.googleapis.com/auth/chat.spaces.readonly
openid
email
profile
```

**Why these scopes?**
- `chat.messages.readonly`: Read message metadata (timestamps, senders, threads)
- `chat.spaces.readonly`: List available spaces/rooms
- `openid`, `email`, `profile`: User authentication

---

## Troubleshooting

### "Google Chat not connected"
- Check that OAuth flow completed successfully
- Verify `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` are set
- Ensure redirect URI matches exactly in Google Cloud Console

### "No spaces found"
- User must be a member of at least one Google Chat space/room
- Refresh OAuth token if expired
- Check Google Chat API is enabled in Cloud Console

### "Ad-hoc meetings not detected"
- Ensure messages contain `meet.google.com/xxx` format links
- Links must be in recent messages (last 7 days)
- Check that space ID is correctly associated with team

### "403 Forbidden" errors
- OAuth scopes may be insufficient
- Re-authorize with correct scopes
- Check API quotas in Google Cloud Console

---

## Environment Variables Reference

```bash
# Required
GOOGLE_CLIENT_ID=123456789-abcdef.apps.googleusercontent.com
GOOGLE_CLIENT_SECRET=GOCSPX-xxxxxxxxxxxxx

# Optional (falls back to dynamic URL)
GOOGLE_CHAT_REDIRECT_URI=https://api.signaltrue.ai/api/integrations/google-chat/oauth/callback
```

---

## Next Steps

1. ✅ Complete OAuth setup in Google Cloud Console
2. ✅ Add environment variables to backend
3. ✅ Connect Google Chat from SignalTrue dashboard
4. ✅ Associate each team with their Google Chat space
5. ✅ Run manual refresh to test data collection
6. ✅ Monitor BDI updates and ad-hoc meeting detection

---

## Support

For issues or questions:
- Email: support@signaltrue.ai
- Documentation: https://docs.signaltrue.ai
- API Reference: https://api.signaltrue.ai/docs
