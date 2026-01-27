# Category-King Integrations & AI Copilot

## Overview

This implementation adds the **Category-King Stack** - a set of integrations and metrics that differentiate SignalTrue from competitors. It includes:

1. **6+ Integration Connectors**: Jira, Asana, Gmail, Google Meet, Notion, HubSpot, Pipedrive
2. **Normalized Event Stream**: All integration data flows into a unified `work_events` collection
3. **Research-Backed Signals**: 10 causal signal types grounded in organizational psychology research
4. **AI Copilot**: ChatGPT-powered explanations with deterministic action selection

## Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        Integration Layer                        │
├─────────────┬─────────────┬─────────────┬──────────────────────┤
│    Jira     │   Asana     │   Gmail     │  Google Meet         │
│   Adapter   │   Adapter   │   Adapter   │    Adapter           │
├─────────────┴─────────────┴─────────────┴──────────────────────┤
│                                                                 │
│                    work_events Collection                       │
│              (Normalized, Append-Only Event Stream)             │
│                                                                 │
├─────────────────────────────────────────────────────────────────┤
│                     Metrics Computation                         │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  Daily Metrics  │  │ Weekly Rollups  │  │   Baselines     │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│                     Signal Generation                           │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │   Z-Score       │  │   Severity      │  │   Confidence    │ │
│  │   Calculation   │  │   Mapping       │  │   Scoring       │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
├─────────────────────────────────────────────────────────────────┤
│                        AI Copilot                               │
│  ┌─────────────────┐  ┌─────────────────┐  ┌─────────────────┐ │
│  │  Deterministic  │  │   Generative    │  │    Response     │ │
│  │  ActionSelector │──│ NarrativeCompose│──│    Caching      │ │
│  └─────────────────┘  └─────────────────┘  └─────────────────┘ │
└─────────────────────────────────────────────────────────────────┘
```

## Environment Variables

Add these to your `.env` file:

```bash
# ============================================
# INTEGRATION OAUTH CREDENTIALS
# ============================================

# Jira (Atlassian Cloud)
JIRA_CLIENT_ID=your_jira_client_id
JIRA_CLIENT_SECRET=your_jira_client_secret

# Asana
ASANA_CLIENT_ID=your_asana_client_id
ASANA_CLIENT_SECRET=your_asana_client_secret

# Google (Gmail + Meet/Calendar)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret

# Notion
NOTION_CLIENT_ID=your_notion_client_id
NOTION_CLIENT_SECRET=your_notion_client_secret

# HubSpot
HUBSPOT_CLIENT_ID=your_hubspot_client_id
HUBSPOT_CLIENT_SECRET=your_hubspot_client_secret

# Pipedrive
PIPEDRIVE_CLIENT_ID=your_pipedrive_client_id
PIPEDRIVE_CLIENT_SECRET=your_pipedrive_client_secret

# ============================================
# AI COPILOT (OpenAI)
# ============================================
OPENAI_API_KEY=sk-your-openai-api-key
OPENAI_MODEL=gpt-4  # or gpt-3.5-turbo for lower cost

# ============================================
# TOKEN ENCRYPTION
# ============================================
ENCRYPTION_KEY=your-32-byte-encryption-key  # For encrypting OAuth tokens
```

## New Files Created

### Backend Models
- `models/workEvent.js` - Normalized event stream (append-only)
- `models/integrationConnection.js` - OAuth tokens & sync status per org
- `models/integrationMetricsDaily.js` - Daily computed metrics
- `models/categoryKingSignal.js` - Research-backed causal signals

### Backend Routes
- `routes/categoryKingIntegrations.js` - OAuth flows for all integrations
- `routes/integrationDashboard.js` - Dashboard tile API
- `routes/aiCopilot.js` - AI Copilot endpoints

### Backend Services
- `services/integrationAdapters.js` - Adapter pattern for each integration
- `services/integrationMetricsService.js` - Daily/weekly metric computation
- `services/signalGenerationService.js` - Signal detection with baselines
- `services/actionPlaybookService.js` - Deterministic action selection
- `services/aiCopilotService.js` - ChatGPT integration with caching
- `services/integrationSyncScheduler.js` - Cron job scheduler

### Frontend Components
- `components/AICopilotPanel.js` - AI insights sidebar
- `components/IntegrationDashboard.js` - Integration management tiles
- `components/CategoryKingSignalCard.js` - Signal display cards
- `pages/IntegrationsPage.tsx` - Main integrations page

## API Endpoints

### Integration OAuth
```
GET  /api/integrations-v2/:source/start     # Start OAuth flow
POST /api/integrations-v2/:source/callback  # OAuth callback
POST /api/integrations-v2/:source/disconnect # Disconnect
POST /api/integrations-v2/sync/:source      # Trigger manual sync
POST /api/integrations-v2/ingest/:source    # Manual event ingestion
POST /api/integrations-v2/backfill/:source  # Backfill historical data
```

### Integration Dashboard
```
GET  /api/integration-dashboard/tiles           # Get all integration tiles
GET  /api/integration-dashboard/:source/details # Get integration details
POST /api/integration-dashboard/compute-metrics # Trigger metric computation
```

### AI Copilot
```
POST /api/ai/copilot                 # Main copilot endpoint
POST /api/ai/copilot/explain         # Explain a specific signal
POST /api/ai/copilot/actions         # Get recommended actions
GET  /api/ai/copilot/playbooks       # Get all playbooks (admin)
GET  /api/ai/copilot/playbook/:type  # Get specific playbook
POST /api/ai/copilot/templates       # Generate message templates
POST /api/ai/copilot/what-to-measure # Suggest missing integrations
POST /api/ai/copilot/feedback        # Submit feedback
GET  /api/ai/copilot/explainability  # AI explainability info
```

## Category-King Metrics

| Metric | Formula | Description |
|--------|---------|-------------|
| **CVIR** | `(completion_rate × velocity) / (1 + rework_ratio)` | Completed Value vs Input Ratio |
| **RCI** | `(1 - after_hours_ratio) × (avg_recovery / 15)` | Recovery Capacity Index |
| **WAP** | `sigmoid(age_days / 14)` | Work Aging Pressure |
| **PIS** | `external_events / total_events` | Pressure Injection Score |

## Signal Types

| Signal | Trigger | Research Basis |
|--------|---------|----------------|
| `recovery_collapse` | Recovery time < 5 min between meetings | Meeting fatigue research |
| `execution_stagnation` | Completion rate drops while WIP rises | JD-R model |
| `rework_spiral` | Reopened tasks > 15% | Quality research |
| `boundary_erosion` | After-hours emails > 25% | Barber & Santuzzi, 2015 |
| `meeting_fatigue` | Meeting hours > 25/week | Bailenson, 2021 |
| `decision_churn` | Doc revisions > 3x baseline | Decision fatigue research |
| `wip_overload` | WIP > 2× capacity | Flow theory |
| `panic_coordination` | Ad-hoc meetings > 5/week | Crisis management research |
| `external_pressure_injection` | CRM activity spikes | Boundary theory |
| `overcommitment_risk` | Planned > 1.5× demonstrated capacity | Planning fallacy research |

## Cron Jobs

| Schedule | Job | Description |
|----------|-----|-------------|
| `*/15 6-22 * * *` | Incremental Sync | Sync last 30 mins of data |
| `0 3 * * *` | Daily Backfill | Full 24-hour sync |
| `0 4 * * *` | Daily Metrics | Compute daily metrics |
| `30 4 * * *` | Signal Generation | Detect signals |
| `0 5 * * 1` | Weekly Rollups | Compute weekly aggregates |

## Privacy & Security

- **Metadata Only**: No email bodies, document content, or chat messages
- **Encrypted Tokens**: OAuth tokens encrypted at rest with AES-256
- **Privacy Levels**: Each event tagged with `metadata_only` privacy level
- **No Individual Tracking**: Signals focus on team patterns, not individuals
- **GDPR Compliant**: Data retention and deletion policies enforced

## Testing

### Test OAuth Flow
```bash
# Start Jira OAuth
curl "http://localhost:8080/api/integrations-v2/jira/start?callback=http://localhost:3000/integrations/callback"
```

### Test AI Copilot
```bash
curl -X POST http://localhost:8080/api/ai/copilot \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_TOKEN" \
  -d '{
    "teamId": "team123",
    "timeRange": "last_7d",
    "viewerRole": "TEAM_LEAD"
  }'
```

### Trigger Manual Sync
```bash
curl -X POST http://localhost:8080/api/integrations-v2/sync/jira \
  -H "Authorization: Bearer YOUR_TOKEN"
```

## Frontend Usage

### Integrations Page
Navigate to `/integrations` to:
- View connected integrations
- Connect new data sources
- Trigger manual syncs
- See AI insights

### Embedding Copilot Panel
```jsx
import AICopilotPanel from './components/AICopilotPanel';

<AICopilotPanel
  orgId={orgId}
  teamId={teamId}
  signals={signals}
  viewerRole="TEAM_LEAD"
  onActionTaken={(action) => console.log('Action taken:', action)}
/>
```

### Embedding Signal Cards
```jsx
import CategoryKingSignalCard from './components/CategoryKingSignalCard';

<CategoryKingSignalCard
  signal={signal}
  showCopilot={true}
  onActionTaken={(signal, action) => markActionComplete(signal, action)}
  onViewDetails={(signal) => openCopilotModal(signal)}
/>
```
