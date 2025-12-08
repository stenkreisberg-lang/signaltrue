// ...existing code...
import { WebClient } from '@slack/web-api';
import Team from '../models/team.js';
import Organization from '../models/organizationModel.js';
import getProvider from '../utils/aiProvider.js';
import { createSnapshot } from '../utils/bdiHistory.js';

// ...existing code...

const token = process.env.SLACK_BOT_TOKEN;
let client = null;
if (token) client = new WebClient(token);

export async function fetchChannelMessages(channelId, days = 7) {
  if (!client) throw new Error('Slack client not configured');

  const oldest = Math.floor(Date.now() / 1000) - days * 24 * 3600;
  const res = await client.conversations.history({ channel: channelId, oldest, limit: 1000 });
  return res.messages || [];
}

export async function analyzeSentiment(messages) {
  // Sample up to 20 messages for sentiment analysis
  const sample = messages.filter(m => m.text && m.text.length > 10).slice(0, 20);
  if (sample.length === 0) return 0;

  const combinedText = sample.map(m => m.text).join('\n');
  
  try {
    const providerClient = getProvider();
    const prompt = `Analyze the sentiment of these Slack messages on a scale from -1 (very negative) to +1 (very positive). Return only a number between -1 and 1:\n\n${combinedText}`;
    
    const completion = await providerClient.generate({ 
      prompt, 
      model: process.env.OPENAI_MODEL || 'gpt-3.5-turbo',
      max_tokens: 10
    });
    
    const content = completion.choices?.[0]?.message?.content || '0';
    const sentiment = parseFloat(content.trim());
    return isNaN(sentiment) ? 0 : Math.max(-1, Math.min(1, sentiment));
  } catch (err) {
    console.warn('Sentiment analysis failed:', err.message);
    return 0;
  }
}

export async function analyzeChannel(channelId) {
  // fetch messages
  const messages = await fetchChannelMessages(channelId);
  const messageCount = messages.length;
  
  // Calculate average response delay
  let totalDelay = 0;
  let delays = 0;
  for (let i = 1; i < messages.length; i++) {
    const prev = messages[i-1];
    const cur = messages[i];
    if (prev.user && cur.user && prev.user !== cur.user && prev.ts && cur.ts) {
      const dt = Math.abs(parseFloat(cur.ts) - parseFloat(prev.ts));
      totalDelay += dt;
      delays++;
    }
  }
  const avgResponseDelayHours = delays ? (totalDelay / delays) / 3600 : 0;
  
  // Analyze sentiment using AI
  const sentiment = await analyzeSentiment(messages);

  return { messageCount, avgResponseDelayHours, sentiment };
}

export async function refreshAllTeamsFromSlack() {
  console.log('🔄 Starting Slack data refresh for all teams...');
  const teams = await Team.find({ slackChannelId: { $exists: true, $ne: null } });
  
  let updated = 0;
  for (const t of teams) {
    try {
      const channelId = t.slackChannelId;
      if (!channelId) continue;
      
      const data = await analyzeChannel(channelId);
      t.slackSignals = { 
        messageCount: data.messageCount,
        avgResponseDelayHours: Math.round(data.avgResponseDelayHours * 10) / 10,
        sentiment: Math.round(data.sentiment * 100) / 100
      };
      
      // Update BDI based on signals
      const sentimentImpact = data.sentiment * 10;
      const responseImpact = Math.max(-10, Math.min(10, (5 - data.avgResponseDelayHours) * 2));
      t.bdi = Math.max(0, Math.min(100, t.bdi + Math.round(sentimentImpact + responseImpact)));
      
      await t.save();
      // Update organization sync counters
      if (t.orgId) {
        try {
          const org = await Organization.findById(t.orgId);
          if (org) {
            org.integrations = org.integrations || {};
            org.integrations.slack = org.integrations.slack || {};
            org.integrations.slack.sync = org.integrations.slack.sync || {};
            org.integrations.slack.sync.messagesAnalyzed = (org.integrations.slack.sync.messagesAnalyzed || 0) + (data.messageCount || 0);
            org.integrations.slack.sync.lastStatus = 'ok';
            org.integrations.slack.sync.lastRunAt = new Date();
            await org.save();
          }
        } catch (e) {
          console.warn('Failed updating org Slack sync counters:', e.message);
        }
      }
      
      // Create snapshot after updating BDI
      await createSnapshot(t._id);
      
      updated++;
      console.log(`✅ Updated team ${t.name} (BDI: ${t.bdi})`);
    } catch (err) {
      console.error(`❌ Slack refresh error for team ${t.name}:`, err.message);
    }
  }
  
  console.log(`✅ Slack refresh complete. Updated ${updated}/${teams.length} teams.`);
  return { updated, total: teams.length };
}
