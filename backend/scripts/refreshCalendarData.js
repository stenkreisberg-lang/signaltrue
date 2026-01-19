import mongoose from 'mongoose';
import dotenv from 'dotenv';
import { fileURLToPath } from 'url';
import { dirname, join } from 'path';
import { google } from 'googleapis';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
dotenv.config({ path: join(__dirname, '..', '.env') });

// Import user model
import User from '../models/user.js';
import Team from '../models/team.js';

async function refreshCalendarData() {
  await mongoose.connect(process.env.MONGO_URI);
  
  console.log('🔄 Starting calendar data refresh...\n');
  
  // Get the user
  const user = await User.findOne({ email: 'sten.kreisberg@signaltrue.ai' });
  
  if (!user) {
    console.log('❌ User not found');
    await mongoose.disconnect();
    return;
  }
  
  console.log('User:', user.email);
  console.log('Has Google tokens:', !!user.google);
  
  if (!user.google?.accessToken || !user.google?.refreshToken) {
    console.log('❌ No Google tokens found. User needs to reconnect Google Calendar.');
    await mongoose.disconnect();
    return;
  }
  
  console.log('Token expiry:', new Date(user.google.expiry_date));
  console.log('Token expired:', user.google.expiry_date < Date.now());
  
  // Create OAuth2 client
  const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET
  );
  
  oauth2Client.setCredentials({
    access_token: user.google.accessToken,
    refresh_token: user.google.refreshToken,
    expiry_date: user.google.expiry_date,
  });
  
  // Try to refresh the token
  try {
    console.log('\n🔑 Attempting to refresh tokens...');
    const { credentials } = await oauth2Client.refreshAccessToken();
    
    console.log('✅ Tokens refreshed successfully!');
    console.log('New expiry:', new Date(credentials.expiry_date));
    
    // Update user with new tokens
    user.google.accessToken = credentials.access_token;
    if (credentials.refresh_token) {
      user.google.refreshToken = credentials.refresh_token;
    }
    user.google.expiry_date = credentials.expiry_date;
    await user.save();
    
    console.log('✅ User tokens updated in database');
    
    // Now fetch calendar events
    console.log('\n📅 Fetching calendar events...');
    
    oauth2Client.setCredentials(credentials);
    const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
    
    const now = new Date();
    const oneWeekAgo = new Date();
    oneWeekAgo.setDate(now.getDate() - 7);
    
    const res = await calendar.events.list({
      calendarId: 'primary',
      timeMin: oneWeekAgo.toISOString(),
      timeMax: now.toISOString(),
      maxResults: 50,
      singleEvents: true,
      orderBy: 'startTime',
    });
    
    const events = res.data.items || [];
    console.log(`Found ${events.length} events in the last week\n`);
    
    // Calculate metrics
    let totalMeetingMinutes = 0;
    let afterHoursMeetings = 0;
    
    events.forEach(event => {
      if (event.start?.dateTime && event.end?.dateTime) {
        const start = new Date(event.start.dateTime);
        const end = new Date(event.end.dateTime);
        const durationMinutes = (end - start) / (1000 * 60);
        totalMeetingMinutes += durationMinutes;
        
        const startHour = start.getHours();
        if (startHour < 9 || startHour >= 18) {
          afterHoursMeetings++;
        }
        
        console.log(`- ${event.summary || 'No title'}: ${Math.round(durationMinutes)}min`);
      }
    });
    
    const meetingHoursWeek = Math.round(totalMeetingMinutes / 60 * 10) / 10;
    const focusHoursWeek = Math.max(0, 40 - meetingHoursWeek);
    const focusToMeetingRatio = meetingHoursWeek > 0 ? Math.round(focusHoursWeek / meetingHoursWeek * 100) / 100 : 10;
    
    console.log('\n📊 Calculated Metrics:');
    console.log(`Meeting hours this week: ${meetingHoursWeek}h`);
    console.log(`Focus hours this week: ${focusHoursWeek}h`);
    console.log(`After-hours meetings: ${afterHoursMeetings}`);
    console.log(`Focus-to-meeting ratio: ${focusToMeetingRatio}`);
    
    // Update team with calendar signals
    const team = await Team.findById(user.teamId);
    if (team) {
      team.calendarSignals = {
        meetingHoursWeek,
        afterHoursMeetings,
        recoveryScore: Math.max(0, 100 - (afterHoursMeetings * 10)),
        focusHoursWeek,
        focusToMeetingRatio,
      };
      await team.save();
      console.log('\n✅ Team calendar signals updated!');
    }
    
  } catch (error) {
    console.error('\n❌ Error:', error.message);
    
    if (error.message.includes('invalid_grant') || error.message.includes('Token has been expired or revoked')) {
      console.log('\n⚠️  The refresh token is no longer valid.');
      console.log('The user needs to disconnect and reconnect Google Calendar:');
      console.log('1. Go to Dashboard');
      console.log('2. Click "Disconnect" on Google Calendar');
      console.log('3. Click "Connect Google Calendar" again');
    }
  }
  
  await mongoose.disconnect();
}

refreshCalendarData();
