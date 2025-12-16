import express from "express";
import { google } from "googleapis";
import jwt from "jsonwebtoken";
import User from "../models/user.js";
import { authenticateToken } from "../middleware/auth.js";
import { WebClient } from "@slack/web-api";
import Organization from "../models/organizationModel.js";
import { v4 as uuidv4 } from "uuid";


const router = express.Router();

// Helper: get redirect URL for dashboard with message
function dashboardRedirect(success = true) {
  const frontendUrl = process.env.FRONTEND_URL || "https://www.signaltrue.ai";
  const msg = success
    ? encodeURIComponent("Integration connected successfully. SignalTrue will now start analyzing data.")
    : encodeURIComponent("Integration failed. Please try again.");
  return `${frontendUrl}/dashboard?integrationStatus=${success ? "success" : "error"}&msg=${msg}`;
}

// Get backend URL for OAuth callbacks
function getBackendUrl(req) {
  if (process.env.BACKEND_URL) return process.env.BACKEND_URL;
  // Fallback: construct from request headers (works on Render/Railway/Heroku)
  const proto = (req.headers['x-forwarded-proto'] || req.protocol || 'https');
  const host = (req.headers['x-forwarded-host'] || req.get('host'));
  return `${proto}://${host}`;
}

// Slack OAuth entry
router.get("/auth/slack", (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(401).json({ message: "Unauthorized: No token provided in query." });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: "Forbidden: Invalid token." });
    }

    const clientId = process.env.SLACK_CLIENT_ID;
    const redirectUri = `${getBackendUrl(req)}/api/auth/slack/callback`;
    // Pass the orgId in the state parameter to link the Slack install to the org
    const state = jwt.sign({ orgId: user.orgId }, process.env.JWT_SECRET, { expiresIn: '15m' });
    const url = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=channels:read,groups:read,users:read,chat:write,team:read&redirect_uri=${encodeURIComponent(redirectUri)}&state=${state}`;
    res.redirect(url);
  });
});

// Slack OAuth callback
router.get("/auth/slack/callback", async (req, res) => {
  const { code, state } = req.query;

  if (!code || !state) {
    return res.redirect(dashboardRedirect(false));
  }

  try {
    const decodedState = jwt.verify(state, process.env.JWT_SECRET);
    const { orgId } = decodedState;

    const slackClient = new WebClient();
    const oauthResponse = await slackClient.oauth.v2.access({
      client_id: process.env.SLACK_CLIENT_ID,
      client_secret: process.env.SLACK_CLIENT_SECRET,
      code,
      redirect_uri: `${getBackendUrl(req)}/api/auth/slack/callback`,
    });

    if (!oauthResponse.ok) {
      throw new Error(oauthResponse.error);
    }

    const { access_token, team } = oauthResponse;

    const org = await Organization.findById(orgId);
    if (!org) {
      return res.redirect(dashboardRedirect(false));
    }

    org.integrations.slack = {
      accessToken: access_token,
      teamId: team.id,
      teamName: team.name,
      installed: true,
    };

    await org.save();

    res.redirect(dashboardRedirect(true));
  } catch (error) {
    console.error("Slack OAuth callback error:", error);
    res.redirect(dashboardRedirect(false));
  }
});

// Google OAuth entry
router.get("/auth/google", (req, res) => {
  const { token } = req.query;

  if (!token) {
    return res.status(401).json({ message: "Unauthorized: No token provided in query." });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ message: "Forbidden: Invalid token." });
    }

    const { userId } = user;
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const redirectUri = `${getBackendUrl(req)}/api/auth/google/callback`;
    const state = jwt.sign({ userId }, process.env.JWT_SECRET, { expiresIn: '15m' });

    const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=https://www.googleapis.com/auth/calendar.readonly&access_type=offline&prompt=consent&state=${state}`;
    res.redirect(url);
  });
});

router.get("/auth/google/callback", async (req, res) => {
  const { code, state } = req.query;

  if (!code || !state) {
    return res.redirect(dashboardRedirect(false));
  }

  try {
    const decodedState = jwt.verify(state, process.env.JWT_SECRET);
    const { userId } = decodedState;

    const oauth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET,
      `${getBackendUrl(req)}/api/auth/google/callback`
    );

    const { tokens } = await oauth2Client.getToken(code);
    oauth2Client.setCredentials(tokens);

    const user = await User.findById(userId);
    if (!user) {
      return res.redirect(dashboardRedirect(false));
    }

    user.google = {
      accessToken: tokens.access_token,
      refreshToken: tokens.refresh_token,
      expiry_date: tokens.expiry_date,
    };

    await user.save();

    res.redirect(dashboardRedirect(true));
  } catch (error) {
    console.error("Google OAuth callback error:", error);
    res.redirect(dashboardRedirect(false));
  }
});

// Outlook OAuth entry
router.get("/auth/outlook", (req, res) => {
  const clientId = process.env.OUTLOOK_CLIENT_ID;
  const redirectUri = `${getBackendUrl(req)}/api/auth/outlook/callback`;
  const url = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${clientId}&response_type=code&redirect_uri=${encodeURIComponent(redirectUri)}&scope=offline_access https://outlook.office.com/calendars.read https://outlook.office.com/mail.read https://outlook.office.com/user.read`;
  res.redirect(url);
});

router.get("/auth/outlook/callback", async (req, res) => {
  // TODO: Exchange code for token, store connection
  // For now, simulate success
  // Record connection in DB here
  // ...
  res.redirect(dashboardRedirect(true));
});

export default router;
