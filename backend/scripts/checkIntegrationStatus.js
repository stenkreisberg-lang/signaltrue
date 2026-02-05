/**
 * Check Integration Status Script
 * Run: node backend/scripts/checkIntegrationStatus.js [orgName]
 * 
 * Checks what organizations exist and their integration/sync status
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

async function checkIntegrationStatus() {
  const orgFilter = process.argv[2]; // Optional org name filter
  
  await mongoose.connect(process.env.MONGO_URI);
  const db = mongoose.connection.db;

  console.log('\n=== SignalTrue Integration Status Check ===\n');

  // Get all organizations
  const query = orgFilter 
    ? { name: { $regex: orgFilter, $options: 'i' } }
    : {};
  
  const orgs = await db.collection('organizations').find(query).toArray();
  
  if (orgs.length === 0) {
    console.log('No organizations found' + (orgFilter ? ` matching "${orgFilter}"` : ''));
    await mongoose.disconnect();
    return;
  }

  for (const org of orgs) {
    console.log(`\n--- Organization: ${org.name || 'Unnamed'} ---`);
    console.log(`  ID: ${org._id}`);
    console.log(`  Slug: ${org.slug || 'N/A'}`);
    console.log(`  Domain: ${org.domain || 'N/A'}`);
    console.log(`  Created: ${org.createdAt || 'N/A'}`);
    
    // Check integrations
    console.log('\n  Integrations:');
    const integrations = org.integrations || {};
    
    // Slack
    if (integrations.slack?.accessToken) {
      console.log('    ✅ Slack: Connected');
      console.log(`       Team: ${integrations.slack.teamName || 'N/A'}`);
      if (integrations.slack.immediateInsights) {
        console.log('       Immediate insights: Available');
        console.log(`       Users: ${integrations.slack.immediateInsights?.stats?.activeUsers || 'N/A'}`);
      }
    } else {
      console.log('    ❌ Slack: Not connected');
    }
    
    // Google Calendar
    if (integrations.google?.accessToken) {
      console.log('    ✅ Google Calendar: Connected');
      console.log(`       Email: ${integrations.google.email || 'N/A'}`);
      if (integrations.google.immediateInsights) {
        console.log('       Immediate insights: Available');
        console.log(`       Meetings this week: ${integrations.google.immediateInsights?.stats?.meetingsThisWeek || 'N/A'}`);
      }
    } else {
      console.log('    ❌ Google Calendar: Not connected');
    }
    
    // Google Chat
    if (integrations.googleChat?.accessToken) {
      console.log('    ✅ Google Chat: Connected');
      if (integrations.googleChat.immediateInsights) {
        console.log('       Immediate insights: Available');
      }
    } else {
      console.log('    ❌ Google Chat: Not connected');
    }
    
    // Microsoft
    if (integrations.microsoft?.accessToken) {
      console.log(`    ✅ Microsoft (${integrations.microsoft.scope || 'unknown'}): Connected`);
      if (integrations.microsoft.immediateInsights) {
        console.log('       Immediate insights: Available');
      }
    } else {
      console.log('    ❌ Microsoft: Not connected');
    }
    
    // Check for synced data
    console.log('\n  Data Status:');
    
    // Teams count
    const teamCount = await db.collection('teams').countDocuments({ orgId: org._id });
    console.log(`    Teams: ${teamCount}`);
    
    // Users count
    const userCount = await db.collection('users').countDocuments({ orgId: org._id });
    console.log(`    Users: ${userCount}`);
    
    // Work events count (last 7 days)
    const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const eventCount = await db.collection('workevents').countDocuments({ 
      orgId: org._id,
      timestamp: { $gte: weekAgo }
    });
    console.log(`    Work events (last 7 days): ${eventCount}`);
    
    // MetricsDaily count (last 7 days)
    const metricsCount = await db.collection('metricsdailies').countDocuments({ 
      orgId: org._id,
      date: { $gte: weekAgo }
    });
    console.log(`    Daily metrics (last 7 days): ${metricsCount}`);
    
    // BDI records
    const bdiCount = await db.collection('behavioraldriftindexes').countDocuments({ 
      orgId: org._id 
    });
    console.log(`    BDI records: ${bdiCount}`);
    
    // IntegrationConnection records
    const intConnCount = await db.collection('integrationconnections').countDocuments({ 
      orgId: org._id 
    });
    if (intConnCount > 0) {
      console.log(`    Integration connections: ${intConnCount}`);
      const intConns = await db.collection('integrationconnections').find({ orgId: org._id }).toArray();
      for (const conn of intConns) {
        console.log(`      - ${conn.integrationType}: connected ${conn.connectedAt || 'N/A'}`);
      }
    }
  }

  console.log('\n=== Check Complete ===\n');
  await mongoose.disconnect();
}

checkIntegrationStatus().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
