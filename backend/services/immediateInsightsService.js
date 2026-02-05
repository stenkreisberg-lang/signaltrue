/**
 * Immediate Insights Service
 * 
 * Provides instant value when integrations first connect:
 * - Fetches initial data from the integration
 * - Calculates quick stats to show immediately
 * - Kicks off background sync for historical data
 */

import Organization from '../models/organizationModel.js';
import Team from '../models/team.js';
import User from '../models/user.js';
import { decryptString } from '../utils/crypto.js';

// Industry benchmarks for comparison during calibration
const INDUSTRY_BENCHMARKS = {
  technology: {
    meetingHoursPerWeek: 22,
    afterHoursPercent: 15,
    avgResponseTimeMinutes: 45,
    focusTimeHoursPerDay: 3.5,
    backToBackMeetingsPercent: 25,
  },
  finance: {
    meetingHoursPerWeek: 28,
    afterHoursPercent: 22,
    avgResponseTimeMinutes: 30,
    focusTimeHoursPerDay: 2.5,
    backToBackMeetingsPercent: 35,
  },
  healthcare: {
    meetingHoursPerWeek: 18,
    afterHoursPercent: 20,
    avgResponseTimeMinutes: 60,
    focusTimeHoursPerDay: 4.0,
    backToBackMeetingsPercent: 20,
  },
  default: {
    meetingHoursPerWeek: 24,
    afterHoursPercent: 18,
    avgResponseTimeMinutes: 52,
    focusTimeHoursPerDay: 3.0,
    backToBackMeetingsPercent: 28,
  }
};

/**
 * Get immediate insights after Slack connects
 */
export async function getSlackImmediateInsights(orgId, accessToken) {
  try {
    const token = accessToken.startsWith('xox') ? accessToken : decryptString(accessToken);
    
    // Fetch basic workspace info
    const teamRes = await fetch('https://slack.com/api/team.info', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const teamData = await teamRes.json();
    
    // Fetch user count
    const usersRes = await fetch('https://slack.com/api/users.list?limit=100', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const usersData = await usersRes.json();
    const activeUsers = usersData.members?.filter(u => !u.deleted && !u.is_bot).length || 0;
    
    // Fetch channel count
    const channelsRes = await fetch('https://slack.com/api/conversations.list?types=public_channel,private_channel&limit=100', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const channelsData = await channelsRes.json();
    const channelCount = channelsData.channels?.length || 0;
    
    const insights = {
      source: 'slack',
      immediate: true,
      stats: {
        workspaceName: teamData.team?.name || 'Unknown',
        activeUsers,
        channelCount,
        dataAvailable: activeUsers > 0,
      },
      message: `Connected to ${teamData.team?.name || 'Slack'} workspace with ${activeUsers} active users and ${channelCount} channels.`
    };
    
    // Save insights to org
    await Organization.findByIdAndUpdate(orgId, {
      $set: {
        'integrations.slack.immediateInsights': insights,
        'integrations.slack.connectedAt': new Date(),
      }
    });
    
    return insights;
  } catch (err) {
    console.error('Slack immediate insights error:', err.message);
    return { source: 'slack', immediate: true, error: err.message };
  }
}

/**
 * Get immediate insights after Google Calendar connects
 */
export async function getCalendarImmediateInsights(orgId, accessToken) {
  try {
    const token = accessToken.includes(':') ? decryptString(accessToken) : accessToken;
    
    // Fetch calendar list
    const calListRes = await fetch('https://www.googleapis.com/calendar/v3/users/me/calendarList?maxResults=10', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const calListData = await calListRes.json();
    
    // Fetch events for primary calendar (next 7 days)
    const now = new Date();
    const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    const eventsRes = await fetch(
      `https://www.googleapis.com/calendar/v3/calendars/primary/events?timeMin=${now.toISOString()}&timeMax=${weekLater.toISOString()}&singleEvents=true&orderBy=startTime&maxResults=100`,
      { headers: { Authorization: `Bearer ${token}` } }
    );
    const eventsData = await eventsRes.json();
    
    const events = eventsData.items || [];
    let totalMeetingMinutes = 0;
    let afterHoursCount = 0;
    let backToBackCount = 0;
    
    events.forEach((event, i) => {
      if (event.start?.dateTime && event.end?.dateTime) {
        const start = new Date(event.start.dateTime);
        const end = new Date(event.end.dateTime);
        totalMeetingMinutes += (end - start) / (1000 * 60);
        
        // After hours (before 8am or after 6pm)
        const hour = start.getHours();
        if (hour < 8 || hour >= 18) afterHoursCount++;
        
        // Back-to-back detection
        if (i > 0 && events[i-1].end?.dateTime) {
          const prevEnd = new Date(events[i-1].end.dateTime);
          const gapMinutes = (start - prevEnd) / (1000 * 60);
          if (gapMinutes <= 15 && gapMinutes >= 0) backToBackCount++;
        }
      }
    });
    
    const meetingHoursThisWeek = Math.round(totalMeetingMinutes / 60 * 10) / 10;
    const benchmarks = INDUSTRY_BENCHMARKS.default;
    
    const insights = {
      source: 'google-calendar',
      immediate: true,
      stats: {
        calendarsConnected: calListData.items?.length || 1,
        meetingsThisWeek: events.length,
        meetingHoursThisWeek,
        afterHoursMeetings: afterHoursCount,
        backToBackMeetings: backToBackCount,
      },
      benchmarks: {
        meetingHoursVsIndustry: meetingHoursThisWeek - benchmarks.meetingHoursPerWeek,
        afterHoursVsIndustry: Math.round((afterHoursCount / Math.max(1, events.length) * 100) - benchmarks.afterHoursPercent),
      },
      message: `${events.length} meetings scheduled this week (${meetingHoursThisWeek} hours). ${afterHoursCount} outside normal hours, ${backToBackCount} back-to-back.`
    };
    
    return insights;
  } catch (err) {
    console.error('Calendar immediate insights error:', err.message);
    return { source: 'google-calendar', immediate: true, error: err.message };
  }
}

/**
 * Get immediate insights after Microsoft (Outlook/Teams) connects
 */
export async function getMicrosoftImmediateInsights(orgId, accessToken, scope = 'outlook') {
  try {
    const token = accessToken.includes(':') ? decryptString(accessToken) : accessToken;
    
    if (scope === 'outlook') {
      // Fetch calendar events
      const now = new Date();
      const weekLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
      const eventsRes = await fetch(
        `https://graph.microsoft.com/v1.0/me/calendarview?startDateTime=${now.toISOString()}&endDateTime=${weekLater.toISOString()}&$top=100`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const eventsData = await eventsRes.json();
      
      const events = eventsData.value || [];
      let totalMeetingMinutes = 0;
      let afterHoursCount = 0;
      
      events.forEach(event => {
        if (event.start?.dateTime && event.end?.dateTime) {
          const start = new Date(event.start.dateTime);
          const end = new Date(event.end.dateTime);
          totalMeetingMinutes += (end - start) / (1000 * 60);
          
          const hour = start.getHours();
          if (hour < 8 || hour >= 18) afterHoursCount++;
        }
      });
      
      const meetingHoursThisWeek = Math.round(totalMeetingMinutes / 60 * 10) / 10;
      
      return {
        source: 'microsoft-outlook',
        immediate: true,
        stats: {
          meetingsThisWeek: events.length,
          meetingHoursThisWeek,
          afterHoursMeetings: afterHoursCount,
        },
        message: `${events.length} Outlook meetings scheduled this week (${meetingHoursThisWeek} hours).`
      };
    } else {
      // Teams - fetch joined teams
      const teamsRes = await fetch('https://graph.microsoft.com/v1.0/me/joinedTeams?$top=50', {
        headers: { Authorization: `Bearer ${token}` }
      });
      const teamsData = await teamsRes.json();
      const teams = teamsData.value || [];
      
      return {
        source: 'microsoft-teams',
        immediate: true,
        stats: {
          teamsCount: teams.length,
          teamNames: teams.slice(0, 5).map(t => t.displayName),
        },
        message: `Connected to ${teams.length} Microsoft Teams.`
      };
    }
  } catch (err) {
    console.error('Microsoft immediate insights error:', err.message);
    return { source: `microsoft-${scope}`, immediate: true, error: err.message };
  }
}

/**
 * Get immediate insights after Google Chat connects
 */
export async function getGoogleChatImmediateInsights(orgId, accessToken) {
  try {
    const token = accessToken.includes(':') ? decryptString(accessToken) : accessToken;
    
    // Fetch spaces
    const spacesRes = await fetch('https://chat.googleapis.com/v1/spaces?pageSize=50', {
      headers: { Authorization: `Bearer ${token}` }
    });
    const spacesData = await spacesRes.json();
    const spaces = spacesData.spaces || [];
    
    return {
      source: 'google-chat',
      immediate: true,
      stats: {
        spacesCount: spaces.length,
        spaceNames: spaces.slice(0, 5).map(s => s.displayName || s.name),
      },
      message: `Connected to ${spaces.length} Google Chat spaces.`
    };
  } catch (err) {
    console.error('Google Chat immediate insights error:', err.message);
    return { source: 'google-chat', immediate: true, error: err.message };
  }
}

/**
 * Get industry benchmark comparison for an org
 */
export async function getIndustryBenchmarks(orgId) {
  const org = await Organization.findById(orgId);
  const industry = (org?.industry || 'default').toLowerCase().replace(/\s+/g, '');
  
  return INDUSTRY_BENCHMARKS[industry] || INDUSTRY_BENCHMARKS.default;
}

/**
 * Get comparison stats (your org vs industry)
 */
export async function getOrgVsBenchmarks(orgId) {
  const org = await Organization.findById(orgId);
  const benchmarks = await getIndustryBenchmarks(orgId);
  
  // Get actual org metrics (from immediate insights or synced data)
  const slackInsights = org?.integrations?.slack?.immediateInsights?.stats || {};
  const calendarInsights = org?.integrations?.google?.immediateInsights?.stats || {};
  const msInsights = org?.integrations?.microsoft?.immediateInsights?.stats || {};
  
  const actualMeetingHours = calendarInsights.meetingHoursThisWeek || msInsights.meetingHoursThisWeek || null;
  
  return {
    industry: org?.industry || 'Technology',
    benchmarks,
    yourData: {
      meetingHoursPerWeek: actualMeetingHours,
      // Add more as data becomes available
    },
    comparison: {
      meetingHours: actualMeetingHours ? {
        yours: actualMeetingHours,
        industry: benchmarks.meetingHoursPerWeek,
        diff: Math.round((actualMeetingHours - benchmarks.meetingHoursPerWeek) * 10) / 10,
        percent: Math.round((actualMeetingHours / benchmarks.meetingHoursPerWeek - 1) * 100),
        status: actualMeetingHours > benchmarks.meetingHoursPerWeek * 1.2 ? 'high' : 
                actualMeetingHours < benchmarks.meetingHoursPerWeek * 0.8 ? 'low' : 'normal'
      } : null
    },
    message: actualMeetingHours 
      ? `Your team averages ${actualMeetingHours}h of meetings per week. Industry average: ${benchmarks.meetingHoursPerWeek}h.`
      : 'Connect a calendar integration to see how you compare to industry benchmarks.'
  };
}

export default {
  getSlackImmediateInsights,
  getCalendarImmediateInsights,
  getMicrosoftImmediateInsights,
  getGoogleChatImmediateInsights,
  getIndustryBenchmarks,
  getOrgVsBenchmarks,
};
