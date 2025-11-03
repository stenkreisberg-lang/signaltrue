import express from "express";
import { v4 as uuidv4 } from "uuid";
import dotenv from "dotenv";
dotenv.config();

const router = express.Router();

// Helper: get redirect URL for dashboard with message
function dashboardRedirect(success = true) {
  const msg = success
    ? encodeURIComponent("Integration connected successfully. SignalTrue will now start analyzing data.")
    : encodeURIComponent("Integration failed. Please try again.");
  return `/dashboard?integrationStatus=${success ? "success" : "error"}&msg=${msg}`;
}

// Slack OAuth entry
router.get("/auth/slack", (req, res) => {
  const clientId = process.env.SLACK_CLIENT_ID;
  const redirectUri = `${process.env.FRONTEND_URL || "https://app.signaltrue.ai"}/auth/slack/callback`;
  const url = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=channels:read,groups:read,users:read,chat:write,team:read&redirect_uri=${redirectUri}`;
  res.redirect(url);
});

// Slack OAuth callback
router.get("/auth/slack/callback", async (req, res) => {
  // TODO: Exchange code for token, store connection
  // For now, simulate success
  // Record connection in DB here
  // ...
  res.redirect(dashboardRedirect(true));
});

// Google OAuth entry
router.get("/auth/google", (req, res) => {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const redirectUri = `${process.env.FRONTEND_URL || "https://app.signaltrue.ai"}/auth/google/callback`;
  const url = `https://accounts.google.com/o/oauth2/v2/auth?client_id=${clientId}&redirect_uri=${redirectUri}&response_type=code&scope=https://www.googleapis.com/auth/calendar.readonly https://www.googleapis.com/auth/userinfo.email&access_type=offline`;
  res.redirect(url);
});

router.get("/auth/google/callback", async (req, res) => {
  // TODO: Exchange code for token, store connection
  // For now, simulate success
  // Record connection in DB here
  // ...
  res.redirect(dashboardRedirect(true));
});

// Outlook OAuth entry
router.get("/auth/outlook", (req, res) => {
  const clientId = process.env.OUTLOOK_CLIENT_ID;
  const redirectUri = `${process.env.FRONTEND_URL || "https://app.signaltrue.ai"}/auth/outlook/callback`;
  const url = `https://login.microsoftonline.com/common/oauth2/v2.0/authorize?client_id=${clientId}&response_type=code&redirect_uri=${redirectUri}&scope=offline_access https://outlook.office.com/calendars.read https://outlook.office.com/mail.read https://outlook.office.com/user.read`;
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
