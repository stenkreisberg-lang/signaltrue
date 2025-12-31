import React, { useState } from 'react';
import SiteHeader from '../components/SiteHeader';
import SiteFooter from '../components/SiteFooter';
import ButtonUnified from '../components/ButtonUnified';
import { spacing, typography, colors, layout } from '../styles/designSystem';

const Features = () => {
  const [copied, setCopied] = useState(false);

  const featuresText = `SignalTrue Features

1. Drift Signals
Detects declining participation, slower response times, reduced async contribution.

2. After-Hours Monitoring
Tracks late-night and weekend Slack/email activity patterns.

3. Meeting Load Analysis
Measures total meeting time, back-to-back sessions, fragmentation.

4. Focus Time Calculation
Identifies uninterrupted blocks available for deep work.

5. Response Time Tracking
Monitors how quickly teams respond to messages and requests.

6. Capacity Indicators
Translates behavioral signals into Green/Yellow/Red capacity status.

7. Team-Level Aggregation
Shows patterns across teams (minimum 5 people) to protect individual privacy.

8. Impact Tracking
Shows before/after metrics to prove whether actions worked.

9. Baseline Establishment
Learns normal patterns during first 30 days before flagging drift.

10. Slack Integration
Connects to Slack workspace to analyze message patterns and response times.

11. Google Calendar Integration
Syncs calendar data to measure meeting load and focus time.

12. Microsoft Teams Integration
Analyzes Teams activity, meetings, and collaboration patterns.

13. Weekly Digests
Automated summary emails with key signals and recommended actions.

14. Real-Time Dashboard
Live view of current capacity status and trending signals.

15. Custom Alert Thresholds
Set organization-specific rules for when to flag drift.

16. Recommendation Engine
Suggests specific actions based on detected drift patterns.

18. Action Templates
Pre-built interventions (focus hours, meeting freezes, async days).

19. Manager View
Team-level insights for leaders without exposing individual data.

20. HR Analytics View
Organization-wide trends, risk forecasting, intervention impact.

21. Privacy Controls
Team-level only, no individual tracking, configurable aggregation rules.

22. GDPR Compliance
Legal basis documentation, DPA available, regional data residency.

23. Data Retention Policies
30/90/custom day retention based on tier and customer preference.

24. Audit Logs
Track who accessed what data and when for compliance requirements.

25. Role-Based Access Control
Granular permissions for admins, managers, HR, and team members.

26. Secure Authentication
OAuth-only integration, no password storage, encrypted tokens.

27. API Access
Programmatic access to signals and recommendations for custom workflows.

28. Export Capabilities
Download reports and raw data for external analysis.

29. Multi-Team Support
Manage multiple teams with separate baselines and thresholds.

30. Onboarding Wizard
Guided setup with integration connection and baseline calibration.`;

  const handleCopy = () => {
    navigator.clipboard.writeText(featuresText);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      flexDirection: 'column',
      background: colors.background.primary 
    }}>
      <SiteHeader />
      
      <main style={{ 
        flex: 1,
        padding: `${spacing.section.large} ${spacing.page.default}`,
        maxWidth: layout.maxWidth,
        margin: '0 auto',
        width: '100%'
      }}>
        {/* Hero */}
        <div style={{ 
          textAlign: 'center',
          marginBottom: spacing.section.medium 
        }}>
          <h1 style={{ 
            ...typography.h1,
            marginBottom: spacing.component.medium 
          }}>
            SignalTrue Features
          </h1>
          <p style={{ 
            ...typography.body.large,
            color: colors.text.secondary,
            maxWidth: '600px',
            margin: '0 auto'
          }}>
            Complete list of features and functions for easy reference and sharing.
          </p>
        </div>

        {/* Features Window */}
        <div style={{ 
          background: colors.background.secondary,
          border: `1px solid ${colors.border.default}`,
          borderRadius: '12px',
          overflow: 'hidden',
          boxShadow: '0 4px 12px rgba(0,0,0,0.08)'
        }}>
          {/* Window Header */}
          <div style={{ 
            background: colors.background.primary,
            borderBottom: `1px solid ${colors.border.default}`,
            padding: spacing.component.medium,
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ 
              ...typography.body.default,
              fontWeight: 600,
              color: colors.text.primary 
            }}>
              features.txt
            </div>
            <ButtonUnified
              variant={copied ? 'secondary' : 'primary'}
              size="small"
              onClick={handleCopy}
            >
              {copied ? '✓ Copied!' : 'Copy All'}
            </ButtonUnified>
          </div>

          {/* Features Content */}
          <div style={{ 
            padding: spacing.component.large,
            fontFamily: 'Monaco, Menlo, "Courier New", monospace',
            fontSize: '14px',
            lineHeight: '1.8',
            color: colors.text.primary,
            whiteSpace: 'pre-wrap',
            maxHeight: '70vh',
            overflowY: 'auto'
          }}>
            {featuresText}
          </div>
        </div>

        {/* Additional Actions */}
        <div style={{ 
          marginTop: spacing.section.medium,
          textAlign: 'center',
          display: 'flex',
          gap: spacing.component.medium,
          justifyContent: 'center',
          flexWrap: 'wrap'
        }}>
          <ButtonUnified
            variant="secondary"
            size="medium"
            onClick={() => window.location.href = '/product'}
          >
            View Product Details
          </ButtonUnified>
          <ButtonUnified
            variant="secondary"
            size="medium"
            onClick={() => window.location.href = '/pricing'}
          >
            See Pricing
          </ButtonUnified>
          <ButtonUnified
            variant="primary"
            size="medium"
            onClick={() => window.location.href = '/demo'}
          >
            Request Demo
          </ButtonUnified>
        </div>
      </main>

      <SiteFooter />
    </div>
  );
};

export default Features;
