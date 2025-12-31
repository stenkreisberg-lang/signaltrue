# SignalTrue Product Features

## Core Value Proposition
**Organizational Drift Early Warning System**  
Detect behavioral drift, get capacity indicators, receive recommendations, and track impact—before people feel the damage.

---

## 1. Early-Warning Signal Detection

### Drift Signals
Catch teams drifting from their baseline before disengagement becomes visible in surveys.

- **What it detects**: Declining participation, slower response times, reduced async contribution
- **Example insight**: "Team Product-Alpha: Slack response latency +45% over 14 days. Participation in #general down 30%."
- **Why it matters**: Predicts disengagement before traditional surveys detect it

### Overload Signals
Identify burnout risk before resignations happen.

- **What it detects**: Sustained after-hours activity, meeting load creep, context-switching patterns
- **Example insight**: "Team Engineering-Core: After-hours Slack activity +60% vs baseline. Meeting hours +25% (now 22hr/week avg)."
- **Why it matters**: Burnout risk before people quit

### Focus Erosion
See productivity decline before output drops.

- **What it detects**: Fragmented work blocks, increased interruptions, declining deep work windows
- **Example insight**: "Team Design: Average uninterrupted work block decreased from 2.5hrs to 45min. Context switches +80%."
- **Why it matters**: Productivity loss visible early

### Communication Fragmentation
Detect collaboration friction before project delays.

- **What it detects**: Thread complexity rising, decision closure declining, coordination overhead increasing
- **Example insight**: "Team Product-Beta: Average Slack thread depth +40%. Threads with >15 messages doubled in 2 weeks."
- **Why it matters**: Collaboration breakdown early warning

### Baseline Deviation
Custom thresholds per team, not industry averages.

- **What it detects**: Any sustained change from your team's normal patterns
- **Example insight**: "Team Sales: Typical pattern is 5 meetings/day, 2hr blocks. Now 9 meetings/day, 30min blocks. 400% deviation from baseline."
- **Why it matters**: Detects drift unique to your organization

---

## 2. Capacity Indicators

**Resilience and execution capacity measured against thresholds.**

- **Green (Stable)**: Team operating within healthy baseline
- **Yellow (Drifting)**: Sustained deviation detected, watch closely
- **Red (Sustained Drift)**: Immediate intervention recommended

**Example**: "Execution capacity: Yellow (drifting). Meeting load above healthy threshold. Focus blocks decreased from 2.5hr to 45min average."

---

## 3. Explainable Recommendations

**Concrete, actionable guidance mapped to each signal type.**

### Meeting Overload Playbook
- Freeze new recurring meetings for 2 weeks
- Establish 'focus hours' (9-12am, async-first)
- Audit existing meeting necessity

### After-Hours Drift Playbook
- Set boundary rules (no Slack after 6pm)
- Implement on-call rotation
- Review workload distribution

### Response Latency Drift Playbook
- Define channel norms and SLAs
- Create async response templates
- Reduce urgency culture

### Collaboration Narrowing Playbook
- Implement cross-team pairing
- Schedule cross-functional rituals
- Create unblocking sessions

**Example**: "Recommended action: Freeze recurring meetings for 2 weeks. Establish 'focus hours' 9-12am (async-first). Audit existing meeting necessity."

---

## 4. Impact Tracking (Proof It Worked)

**Before/after metrics show whether actions had an effect.**

- Automatic follow-up after 14 days
- Shows metric deltas (e.g., "-28% after-hours activity vs alert period")
- Updates capacity indicator (Yellow → Green)
- Tracks which actions were taken

**Example**: "14 days after action: After-hours activity returned to baseline (-28% vs alert period). Response latency improved 15%. Execution capacity: Green (stable)."

---

## 5. Privacy-First by Default

### Team-Level Aggregation
- **Minimum team size**: 5 people (configurable up to 8-10 for extra privacy)
- **No individual dashboards**: Signals are team-level only
- **No per-person metrics**: Ever

### What We Do NOT Collect
✗ No message content (Slack, Teams, email)  
✗ No document content (Google Docs, Notion, files)  
✗ No screenshots or keystroke logging  
✗ No location tracking  
✗ No individual performance scores  

### What We DO Collect (Metadata Only)
✓ Slack: Message timestamps, thread depth, channel activity, response latency, @mentions count, emoji reactions count  
✓ Google Calendar: Meeting duration, frequency, attendee count, time blocks, after-hours events  
✓ Microsoft Teams: Message timestamps, thread depth, channel activity, response latency, meeting metadata  

### GDPR & Compliance
- **Legal basis**: Legitimate interest for organizational health monitoring
- **Data retention**: 30 days (Detection), 90 days (Impact Proof), Custom (Enterprise)
- **Auto-delete**: Configurable schedules
- **DPA available**: For all customers
- **Regional residency**: EU or US data hosting (Enterprise)
- **Encryption**: AES-256 at rest, TLS 1.3 in transit
- **OAuth-only**: No passwords ever requested

---

## 6. Integrations (Metadata-Only)

**Connect tools via OAuth. No message content accessed.**

- **Slack**: Work patterns, collaboration signals
- **Google Calendar**: Meeting load, focus time
- **Microsoft Teams**: Communication patterns, meeting metadata

**Setup time**: ~5 minutes per integration

---

## 7. Flexible Deployment Options

### Team View (Default)
For organizations with multiple teams. Each team gets individual drift signals and recommendations.

### Org Snapshot
For small teams or flat organizations. Fewer layers, company-wide snapshots. Same signals, simplified structure.

### Cadence Options
- **Always-On**: Real-time signals, alerts when drift detected
- **Weekly/Monthly**: Scheduled reviews, summary reports
- **Quarterly Snapshots**: Point-in-time checks for small teams or periodic audits

---

## 8. Who It's For

**Built for teams of 10 to 5,000.**

- Flat organizations welcome
- No "leader hierarchy" required
- HR, founders, and managers use the same early warning signals
- Works for remote, hybrid, and in-office teams

---

## 9. Adoption Support

### Adoption Kit (Included)
- 3 internal message templates (announce, reminder, FAQ)
- 1 slide deck: "What we track, what we don't"
- FAQ for employees: privacy, AI, anonymity, what managers can see
- Manager playbook: what to do when "red light" triggers

### Sample Data Mode
- Explore with pre-baked scenarios (no integrations required)
- Example scenarios: Meeting overload drift, After-hours drift, Collaboration narrowing
- Clickable product tour with realistic fake data

---

## 10. Pricing Tiers

### Detection (€99/month)
**Early warning for small teams**
- Drift detection for up to 3 teams
- Weekly health summaries
- Slack + Calendar integration
- Signal explanations
- 30-day data retention

### Impact Proof (€199/month) — RECOMMENDED
**For growing organizations**
- Everything in Detection
- Drift detection for up to 10 teams
- Baseline comparison over time
- Recommended action library
- Advanced calendar analytics
- 90-day data retention (configurable)
- Priority support

### Enterprise (Custom pricing)
**Custom deployment & compliance**
- Everything in Impact Proof
- Unlimited teams
- Regional data residency (EU/US)
- SSO & advanced permissions
- Custom retention periods (up to 2 years)
- Dedicated support & CSM
- Custom integrations

---

## 11. Key Differentiators

### vs. Microsoft Viva Insights
- **Viva**: Highlights work habits that may lead to burnout (after-hours, meeting overload)
- **SignalTrue**: Drift detection + capacity indicators + impact tracking. Proves whether actions worked.

### vs. Peakon (Survey Platforms)
- **Peakon**: "How people feel" (survey-based, slow, biased toward people who speak up)
- **SignalTrue**: "How work is behaving" (catches silent issues when people don't self-report)

### vs. Aware (Comms Sentiment AI)
- **Aware**: AI reading messages (trust concerns)
- **SignalTrue**: Explicit about what is NOT analyzed. Metadata only, no message content.

---

## 12. Trust & Explainability

### Explainable Insights
Every alert includes:
- **What changed**: Metric deltas (e.g., "+32% after-hours activity")
- **Duration**: How long sustained (e.g., "3 weeks")
- **Confidence level**: Low, Medium, High (based on data completeness)
- **Data coverage**: Which systems contributed (e.g., "Slack + Google Calendar")

### No Black Box AI
- Signals based on patterns over time, not one-off events
- Drift measured from YOUR baseline, not industry comparisons
- Recommendations are explainable and actionable
- You can always see what triggered an alert

---

## Implementation Timeline

1. **Connect tools** (5 minutes)
2. **Baseline calibration** (7-14 days passive observation)
3. **First signals appear** (after calibration period)
4. **Ongoing monitoring** (always-on or scheduled cadence)
5. **Impact tracking** (14 days after action taken)

---

## Security & Infrastructure

- **Encryption**: AES-256 at rest, TLS 1.3 in transit
- **Access control**: Role-based access control (RBAC)
- **SSO**: Available (Enterprise)
- **Audit logs**: All data access logged (Enterprise)
- **OAuth-only**: No passwords, revoke access anytime via admin console
- **SOC2 Type II**: In progress
- **GDPR compliant**: DPA available, regional data residency

---

## Support & Resources

- **Priority support**: Impact Proof and Enterprise tiers
- **Dedicated CSM**: Enterprise tier
- **Adoption kit**: All tiers
- **Documentation**: Comprehensive guides for setup, privacy, and best practices
- **Trust page**: Full transparency on data collection and privacy

---

**Last Updated**: December 31, 2025  
**Version**: 2.0 (Category Positioning Update)
