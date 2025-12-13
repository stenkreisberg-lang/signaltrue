import { google } from 'googleapis';
import User from '../models/user.js';

async function getOauth2Client(userId) {
  const user = await User.findById(userId);
  if (!user || !user.google || !user.google.accessToken) {
    throw new Error('User not found or Google account not connected.');
  }

  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );

  oauth2Client.setCredentials({
    access_token: user.google.accessToken,
    refresh_token: user.google.refreshToken,
    expiry_date: user.google.expiry_date,
  });

  // Handle token refresh
  oauth2Client.on('tokens', async (tokens) => {
    if (tokens.refresh_token) {
      user.google.refreshToken = tokens.refresh_token;
    }
    user.google.accessToken = tokens.access_token;
    user.google.expiry_date = tokens.expiry_date;
    await user.save();
  });

  return oauth2Client;
}

export async function getCalendarEvents(userId) {
  const oauth2Client = await getOauth2Client(userId);
  const calendar = google.calendar({ version: 'v3', auth: oauth2Client });

  const now = new Date();
  const sevenDaysFromNow = new Date();
  sevenDaysFromNow.setDate(now.getDate() + 7);

  const res = await calendar.events.list({
    calendarId: 'primary',
    timeMin: now.toISOString(),
    timeMax: sevenDaysFromNow.toISOString(),
    maxResults: 10,
    singleEvents: true,
    orderBy: 'startTime',
  });

  return res.data.items;
}
