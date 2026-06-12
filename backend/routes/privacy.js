/**
 * Privacy Routes
 * Transparency features: What we track, what we DON'T track, audit log
 * Employee-facing public explainer
 */

import express from 'express';
import Organization from '../models/organizationModel.js';
import IntegrationConnection from '../models/integrationConnection.js';
import { authenticateToken, requireHROrAdmin } from '../middleware/auth.js';

const router = express.Router();

/**
 * GET /api/privacy/transparency-log
 * Returns timestamped log of data pulls for an organization
 * Admin-only view showing: source, timestamp, aggregation level
 */
router.get('/transparency-log', authenticateToken, requireHROrAdmin, async (req, res) => {
  try {
    const { orgId } = req.user;

    const connections = await IntegrationConnection.find({ orgId })
      .select('integrationType sync measurementScope coverage')
      .lean();
    const logEntries = connections
      .filter((connection) => connection.sync?.lastSuccessfulSyncAt || connection.sync?.lastSyncAt)
      .map((connection) => ({
        timestamp: connection.sync.lastSuccessfulSyncAt || connection.sync.lastSyncAt,
        source: connection.integrationType,
        action: 'Integration metadata synchronization',
        aggregationLevel: connection.measurementScope || 'metadata only',
        recordsProcessed: connection.coverage?.mappedUsers || 0,
        individualDataAccessed: false,
        status: connection.sync?.lastSyncStatus || 'unknown',
      }))
      .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

    res.json({
      orgId,
      logEntries,
      disclaimer:
        'This log reports recorded metadata synchronization activity. No individual messages or email content is included.',
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
    const minimumTeamSize = Math.max(5, Number(org.settings?.minTeamSize) || 5);

    // Return public explainer content
    res.json({
      orgName: org.name,
      explainer: {
        whatWeTrack: [
          'Aggregated activity patterns (team-level)',
          'Meeting frequency and duration (metadata only, no content)',
          'Message volume and response timing (counts only, no message content)',
          'Work hour patterns (after-hours activity, focus time blocks)',
        ],
        whatWeNeverTrack: [
          'Message content from Slack, email, or any communication tool',
          'Email content or subject lines',
          'File contents or document text',
          'Individual performance scores or rankings',
          'Browsing history or screen activity',
          'Keystroke logging or surveillance',
        ],
        howWeProtect: [
          `All data reported at team level (organization minimum: ${minimumTeamSize})`,
          minimumTeamSize < 3
            ? 'Small-team reporting is enabled by the organization and may allow team results to be inferred'
            : 'Team-size thresholds reduce the risk of individual inference',
          'GDPR compliant data handling and storage',
          'OAuth-only access (read-only permissions)',
          'End-to-end encryption for all data in transit and at rest',
          'No data sold to third parties ever',
        ],
        yourRights: [
          'Request data deletion at any time',
          "Export your organization's aggregated data",
          'Revoke integration access instantly',
          'View transparency log of all data pulls (admins)',
        ],
      },
      lastUpdated: new Date().toISOString(),
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
          content:
            "We analyze aggregated team activity patterns including meeting frequency, message volume, response timing, and work hour patterns. Reporting uses each organization's configured team-size threshold.",
        },
        {
          title: 'What We Never Track',
          content:
            'We never access message content, email content, file contents, or any individual surveillance data. No keystroke logging, screen monitoring, or individual performance scoring.',
        },
        {
          title: 'Data Security',
          content:
            'All data is encrypted in transit and at rest. We use OAuth-only access with read-only permissions. GDPR compliant. No data sold to third parties.',
        },
        {
          title: 'Aggregation Thresholds',
          content:
            'Each organization may raise the minimum reporting team size, but it can never be lower than five people. Individual rankings and content are never displayed.',
        },
        {
          title: 'Data Retention',
          content:
            'Free tier: 7 days. Detection tier: 30 days. Impact Proof tier: 90 days. Data auto-deleted after retention period.',
        },
        {
          title: 'Your Rights',
          content:
            'Request data deletion, export aggregated data, revoke integration access, view transparency log (admins).',
        },
      ],
    },
  });
});

export default router;
