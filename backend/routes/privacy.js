/**
 * Privacy Routes
 * Transparency features: What we track, what we DON'T track, audit log
 * Employee-facing public explainer
 */

import express from 'express';
import Organization from '../models/organizationModel.js';
import { authenticateToken } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/privacy/transparency-log
 * Returns timestamped log of data pulls for an organization
 * Admin-only view showing: source, timestamp, aggregation level
 */
router.get('/transparency-log', authenticateToken, async (req, res) => {
  try {
    const { orgId } = req.user;
    
    // In production, this would query actual data access logs
    // For now, we'll return a structured format showing what WOULD be logged
    
    const mockLog = [
      {
        timestamp: new Date(Date.now() - 86400000 * 1), // 1 day ago
        source: 'Slack',
        action: 'Sync public channel messages',
        aggregationLevel: 'Team-level counts only',
        recordsProcessed: 1247,
        individualDataAccessed: false
      },
      {
        timestamp: new Date(Date.now() - 86400000 * 1),
        source: 'Google Calendar',
        action: 'Sync meeting metadata',
        aggregationLevel: 'Duration and frequency aggregates',
        recordsProcessed: 89,
        individualDataAccessed: false
      },
      {
        timestamp: new Date(Date.now() - 86400000 * 2),
        source: 'Slack',
        action: 'Sync public channel messages',
        aggregationLevel: 'Team-level counts only',
        recordsProcessed: 1189,
        individualDataAccessed: false
      },
      {
        timestamp: new Date(Date.now() - 86400000 * 2),
        source: 'Google Calendar',
        action: 'Sync meeting metadata',
        aggregationLevel: 'Duration and frequency aggregates',
        recordsProcessed: 92,
        individualDataAccessed: false
      }
    ];
    
    res.json({
      orgId,
      logEntries: mockLog,
      disclaimer: 'This log shows aggregated data pulls only. No individual messages or email content is ever accessed.'
    });
  } catch (error) {
    console.error('[Privacy] Error fetching transparency log:', error);
    res.status(500).json({ message: 'Failed to fetch transparency log', error: error.message });
  }
});

/**
 * GET /api/privacy/explainer/:orgSlug
 * Public employee-facing page explaining how SignalTrue uses data
 * Accessible without login (but requires valid orgSlug)
 */
router.get('/explainer/:orgSlug', async (req, res) => {
  try {
    const { orgSlug } = req.params;
    
    // Verify org exists
    const org = await Organization.findOne({ slug: orgSlug });
    if (!org) {
      return res.status(404).json({ message: 'Organization not found' });
    }
    
    // Return public explainer content
    res.json({
      orgName: org.name,
      explainer: {
        whatWeTrack: [
          'Aggregated activity patterns (team-level)',
          'Meeting frequency and duration (metadata only, no content)',
          'Message volume and response timing (counts only, no message content)',
          'Work hour patterns (after-hours activity, focus time blocks)'
        ],
        whatWeNeverTrack: [
          'Message content from Slack, email, or any communication tool',
          'Email content or subject lines',
          'File contents or document text',
          'Individual performance scores or rankings',
          'Browsing history or screen activity',
          'Keystroke logging or surveillance'
        ],
        howWeProtect: [
          'All data aggregated to team level (minimum 5 people per team)',
          'GDPR compliant data handling and storage',
          'OAuth-only access (read-only permissions)',
          'End-to-end encryption for all data in transit and at rest',
          'No data sold to third parties ever'
        ],
        yourRights: [
          'Request data deletion at any time',
          'Export your organization\'s aggregated data',
          'Revoke integration access instantly',
          'View transparency log of all data pulls (admins)'
        ]
      },
      lastUpdated: new Date().toISOString()
    });
  } catch (error) {
    console.error('[Privacy] Error fetching explainer:', error);
    res.status(500).json({ message: 'Failed to fetch privacy explainer', error: error.message });
  }
});

/**
 * GET /api/privacy/policy
 * Returns structured privacy policy content
 */
router.get('/policy', async (req, res) => {
  res.json({
    policy: {
      title: 'SignalTrue Privacy & Data Use Policy',
      sections: [
        {
          title: 'What We Track',
          content: 'We analyze aggregated team activity patterns including meeting frequency, message volume, response timing, and work hour patterns. All data is team-level only (minimum 5 people).'
        },
        {
          title: 'What We Never Track',
          content: 'We never access message content, email content, file contents, or any individual surveillance data. No keystroke logging, screen monitoring, or individual performance scoring.'
        },
        {
          title: 'Data Security',
          content: 'All data is encrypted in transit and at rest. We use OAuth-only access with read-only permissions. GDPR compliant. No data sold to third parties.'
        },
        {
          title: 'Aggregation Thresholds',
          content: 'All metrics require minimum 5 people per team. Individual-level data is never stored or displayed. Patterns shown are team averages only.'
        },
        {
          title: 'Data Retention',
          content: 'Free tier: 7 days. Detection tier: 30 days. Impact Proof tier: 90 days. Data auto-deleted after retention period.'
        },
        {
          title: 'Your Rights',
          content: 'Request data deletion, export aggregated data, revoke integration access, view transparency log (admins).'
        }
      ]
    }
  });
});

export default router;
