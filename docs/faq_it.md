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

- Do not claim SOC 2 Type II certification without a current independent audit report.
- GDPR readiness depends on the verified deployment, DPA, data processing, transfer basis and effective technical controls.
- Third-party penetration testing and ISO 27001 certification have not been verified in this repository audit.
- Provide only independently evidenced certificates, reports and controls in customer security questionnaires.

### How is data encrypted?

- TLS encryption protects network connections; exact versions and termination settings must be checked per deployment.
- Database and backup encryption at rest must be verified in their actual provider settings.
- Key management and rotation cannot be represented as AWS KMS or Google Cloud KMS unless those configurations are evidenced.

### Where is data stored?

- The shared production API presently runs on Render in Oregon, United States (verified 10 November 2026).
- The location of primary database storage and backups must be verified from actual provider configuration.
- Do not claim EU-only processing or a specific EU data-residency guarantee until all subprocessors and transfer safeguards have been checked and contractually documented.
- Customer-specific residency may require a separately verified infrastructure deployment.

### How long is data retained?

Retention is defined in the applicable customer agreement and implemented by the live purge configuration. Do not assume raw-data or aggregate retention periods without verifying actual jobs, backups, third-party copies and deletion tests.

### Can we perform a security audit?

Yes. Enterprise customers can:
- Request the current security control inventory and signed DPA
- Request a security questionnaire supported by real configuration evidence
- Ask which independent test reports are available, rather than assuming certification
- Review current data locations, subprocessors, transfer safeguards and retention/deletion evidence

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
