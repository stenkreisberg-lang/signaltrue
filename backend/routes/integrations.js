import express from 'express';

const router = express.Router();

// Simple status endpoint to power onboarding UI until full OAuth is wired
// Returns which providers are theoretically available (env configured)
// and a minimal connected=false placeholder so frontend can render.
router.get('/integrations/status', async (req, res) => {
  try {
    // In a future iteration, look up Integration records by orgId
    // const orgId = req.user?.orgId || req.query.orgId;
    const available = {
      slack: !!process.env.SLACK_CLIENT_ID,
      teams: !!process.env.MS_APP_CLIENT_ID,
      gmail: !!process.env.GOOGLE_CLIENT_ID,
      outlook: !!process.env.MS_APP_CLIENT_ID,
      calendar: !!process.env.GOOGLE_CLIENT_ID,
      hris: !!(process.env.BAMBOOHR_API_KEY || process.env.PERSONIO_CLIENT_ID || process.env.HIBOB_TOKEN || process.env.GUSTO_TOKEN)
    };

    // Placeholder connection state until tokens are stored in DB
    const connected = {
      slack: false,
      teams: false,
      gmail: false,
      outlook: false,
      calendar: false,
      hris: false
    };

    const oauth = {
      slack: available.slack ? '/api/integrations/slack/oauth/start' : null,
      teams: available.teams ? '/api/integrations/teams/oauth/start' : null,
      gmail: available.gmail ? '/api/integrations/google/oauth/start?scope=gmail' : null,
      outlook: available.outlook ? '/api/integrations/microsoft/oauth/start?scope=outlook' : null,
      calendar: available.calendar ? '/api/integrations/google/oauth/start?scope=calendar' : null,
      hris: null
    };

    res.json({ available, connected, oauth });
  } catch (err) {
    res.status(500).json({ message: err.message });
  }
});

export default router;
