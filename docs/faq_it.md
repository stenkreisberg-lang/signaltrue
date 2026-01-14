# IT Security Leader FAQ

## Technical Architecture

### How does SignalTrue integrate with our systems?

SignalTrue uses read-only API integrations with:
- Slack (Workspace-level API)
- Google Workspace (Admin SDK, Calendar API)
- Microsoft 365 (Graph API)

No agents, no software installation, no browser extensions.

### What permissions does SignalTrue require?

**Slack:**
- Read-only access to public channels
- Metadata access (timestamps, not content)
- User list for team mapping

**Google Workspace:**
- Calendar read access (metadata only)
- Chat metadata access (timestamps, not content)
- Admin SDK for user/group mapping

**Microsoft 365:**
- Graph API read access
- Calendar and Teams metadata
- User directory for team mapping

### Is any software installed on employee devices?

**No.** SignalTrue is entirely cloud-based. No:
- Desktop agents
- Mobile apps
- Browser extensions
- Network appliances

### What data leaves our environment?

Only metadata is extracted:
- Timestamps of activities
- Participation patterns (who works with whom)
- Aggregate counts (meeting frequency, etc.)

**Never extracted:**
- Message content
- File contents
- Email bodies
- Document data

## Security and Compliance

### What security certifications does SignalTrue have?

- SOC 2 Type II certified
- GDPR compliant
- Regular third-party penetration testing
- ISO 27001 aligned practices

### How is data encrypted?

- In transit: TLS 1.3
- At rest: AES-256
- Key management: AWS KMS or Google Cloud KMS

### Where is data stored?

- Primary: AWS EU (Frankfurt) or Google Cloud EU
- US data residency available upon request
- No data stored outside contracted regions

### How long is data retained?

Default retention:
- Raw metadata: 90 days
- Aggregated signals: 24 months
- Configurable based on requirements

### Can we perform a security audit?

Yes. Enterprise customers can:
- Review our SOC 2 report
- Request security questionnaire completion
- Discuss penetration test results
- Request additional documentation

## Integration Process

### How long does integration take?

Typical setup: 1-2 hours
- OAuth authorization for each platform
- Team structure configuration
- Privacy settings review
- Verification of data flow

### What network changes are required?

None. SignalTrue connects outbound to SaaS APIs. No:
- Firewall changes
- VPN requirements
- On-premise components
- Network infrastructure changes

### Can we restrict which teams are included?

Yes. You control:
- Which teams are included in analysis
- Which platforms are connected
- What time periods are analyzed
- Privacy threshold settings

### How do we revoke access?

Instant revocation through:
- OAuth token revocation
- Admin console disconnect
- All data deletion upon request

## Data Processing

### Does SignalTrue access message content?

**Absolutely not.** This is a core architectural decision. We:
- Only access metadata (timestamps, patterns)
- Never request content permissions
- Cannot read messages even if we wanted to

### What's the minimum team size?

5 people minimum per analysis group. This ensures:
- No individual identification possible
- Statistical validity of patterns
- Privacy protection by design

### Is data used for AI training?

**No.** Customer data is never used for:
- Model training
- Product improvement algorithms
- Third-party purposes
- Any purpose beyond contracted services

## Incident Response

### What happens in a security incident?

- 24-hour notification for confirmed breaches
- Detailed incident report provided
- Root cause analysis shared
- Remediation plan communicated

### Do you have a bug bounty program?

Contact security@signaltrue.ai for security research coordination.

## Vendor Assessment

### Can you complete our security questionnaire?

Yes. We regularly complete:
- SIG Lite / SIG Core
- CAIQ
- Custom security questionnaires

### Who do we contact for security questions?

Email: security@signaltrue.ai

### What's included in the DPA?

Our Data Processing Agreement includes:
- Sub-processor list and notification procedures
- Data processing locations
- Security measures
- Breach notification procedures
- Audit rights
- Data deletion procedures
