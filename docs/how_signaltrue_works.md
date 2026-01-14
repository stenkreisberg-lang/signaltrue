# How SignalTrue Works

## Technical Overview

SignalTrue analyzes collaboration patterns at the team level using metadata from existing workplace tools. This document explains our methodology and technical approach.

## Data Flow Architecture

### Step 1: Integration Setup

SignalTrue connects to your organization's collaboration platforms via secure, read-only API integrations. Supported platforms include:

- Slack
- Google Workspace (Calendar, Chat)
- Microsoft 365 (Teams, Outlook Calendar)

### Step 2: Metadata Extraction

We extract **only metadata**, which includes:

- Message timestamps (when activity occurs)
- Channel/group participation patterns
- Response time distributions
- Meeting frequency and duration
- Collaboration network structure (who works with whom)

**We explicitly do NOT extract:**

- Message content or text
- Email bodies or subjects
- File contents
- Search queries
- Individual performance data

### Step 3: Team-Level Aggregation

All data is immediately aggregated to the team level:

- Minimum team size: 5 people
- No individual metrics are stored or calculated
- Patterns are computed across the entire group
- Results cannot be traced back to any individual

### Step 4: Behavioral Signal Generation

Our algorithms identify patterns that indicate:

- **Collaboration Load** - Is the team over or under-connected?
- **Response Patterns** - Are response times healthy and sustainable?
- **Meeting Load** - Is the team spending appropriate time in meetings?
- **Focus Time** - Do team members have adequate uninterrupted work periods?

### Step 5: Insight Delivery

Insights are delivered through:

- Dashboard visualizations
- Weekly summary reports
- Alert notifications for significant changes
- Trend analysis over time

## Processing Cadence

- Real-time: Basic connectivity and integration health
- Hourly: Activity pattern updates
- Daily: Behavioral signal calculations
- Weekly: Trend analysis and recommendations

## Data Retention

- Raw metadata: 90 days (configurable)
- Aggregated signals: 24 months
- Historical trends: Indefinite (anonymized)

## Security Measures

- All data encrypted in transit (TLS 1.3)
- All data encrypted at rest (AES-256)
- SOC 2 Type II compliant infrastructure
- Regular third-party security audits
- No customer data used for model training

## What Makes This Different from Monitoring

Traditional monitoring tools track individual behavior and create surveillance dynamics. SignalTrue's approach is fundamentally different:

| Traditional Monitoring | SignalTrue |
|----------------------|------------|
| Reads message content | Only metadata, never content |
| Individual tracking | Team-level only (min 5 people) |
| Performance scoring | No individual scores |
| Surveillance mindset | Organizational health focus |
| Creates distrust | Builds trust through transparency |

## Integration Requirements

For IT teams considering implementation:

- Read-only API access to collaboration platforms
- No agents or software installed on employee devices
- No browser extensions required
- Typical setup time: 1-2 hours
