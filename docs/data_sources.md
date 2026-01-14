# Data Sources and What SignalTrue Analyzes

## Overview

SignalTrue integrates with existing workplace collaboration tools to understand team behavioral patterns. This document details exactly what data we access and what we explicitly do not access.

## Supported Integrations

### Slack

**What we access (metadata only):**
- Timestamp of messages
- Channel membership and participation
- Reaction counts (not content)
- Thread participation patterns
- Active hours distribution

**What we NEVER access:**
- Message text or content
- File contents or attachments
- Direct message content
- Search history
- User profile details beyond name and team

### Google Workspace

**What we access:**
- Calendar event metadata (time, duration, attendee count)
- Meeting frequency patterns
- Google Chat activity timestamps
- Collaboration network structure

**What we NEVER access:**
- Email content or subjects
- Document contents
- Drive file contents
- Chat message text
- Calendar event descriptions or titles

### Microsoft 365

**What we access:**
- Teams activity timestamps
- Meeting metadata from Outlook Calendar
- Collaboration frequency patterns
- Response time distributions

**What we NEVER access:**
- Email bodies or subjects
- Teams message content
- OneNote or document contents
- File attachments
- Individual productivity metrics

## Data Categories

### Category 1: Timing Metadata
- When activity occurs (timestamps)
- Duration of interactions
- Response latency patterns
- Active hours distribution

### Category 2: Structural Metadata
- Who collaborates with whom (network structure)
- Channel/group participation
- Meeting attendance patterns
- Cross-team collaboration frequency

### Category 3: Volume Metadata
- Message counts (not content)
- Meeting frequency
- Collaboration intensity over time

## What We Explicitly Exclude

SignalTrue is designed to NEVER access or process:

1. **Content of any kind**
   - No message text
   - No email bodies
   - No document contents
   - No file attachments

2. **Individual performance indicators**
   - No productivity scores
   - No individual metrics
   - No performance rankings
   - No activity tracking per person

3. **Personal information beyond basics**
   - Only name and team membership
   - No personal details
   - No browsing history
   - No location data

4. **Surveillance-type data**
   - No keystroke logging
   - No screen monitoring
   - No application tracking
   - No time tracking

## Minimum Aggregation Requirements

- All analysis requires minimum 5 people in a group
- No individual-level data is ever stored or computed
- Metrics are always team aggregates
- No way to "drill down" to individual behavior

## Data Access Permissions

When you connect SignalTrue, we request only the minimum permissions needed:

- Read-only access (never write)
- Metadata access (not content)
- Scoped to necessary endpoints only

Your IT team can review all permission requests before approval.
