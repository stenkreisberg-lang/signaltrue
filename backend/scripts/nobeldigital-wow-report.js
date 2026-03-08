/**
 * NobelDigital Week-over-Week Report
 * Run: cd backend && node scripts/nobeldigital-wow-report.js
 * 
 * Pulls this week vs last week data across all data sources:
 * - WorkEvents (Slack/Teams/Calendar/Chat activity)
 * - IntegrationMetricsDaily (capacity, meetings, response times)
 * - Signals (drift signals detected)
 * - CategoryKingSignals (automated pipeline signals)
 * - BDI (Behavioral Drift Index)
 * - MetricsDaily (legacy metrics)
 */

import dotenv from 'dotenv';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import mongoose from 'mongoose';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.resolve(__dirname, '../.env') });

import Organization from '../models/organizationModel.js';
import Team from '../models/team.js';
import User from '../models/user.js';
import WorkEvent from '../models/workEvent.js';
import Signal from '../models/signal.js';
import CategoryKingSignal from '../models/categoryKingSignal.js';
import BehavioralDriftIndex from '../models/behavioralDriftIndex.js';

// Try importing optional models (may not exist)
let IntegrationMetricsDaily, MetricsDaily;
try { IntegrationMetricsDaily = (await import('../models/integrationMetricsDaily.js')).default; } catch {}
try { MetricsDaily = (await import('../models/metricsDaily.js')).default; } catch {}

const now = new Date();

// "This week" = last completed work week: Mon Mar 3 – Sun Mar 8 (today)
// "Last week" = the 7 days before that: Mon Feb 24 – Sun Mar 2
// Using rolling 7-day windows so we always compare real data
const thisWeekEnd = new Date(now);
const thisWeekStart = new Date(now);
thisWeekStart.setDate(now.getDate() - 6); // 7-day window ending today
thisWeekStart.setHours(0, 0, 0, 0);

const lastWeekEnd = new Date(thisWeekStart);
lastWeekEnd.setMilliseconds(-1);
const lastWeekStart = new Date(lastWeekEnd);
lastWeekStart.setDate(lastWeekEnd.getDate() - 6);
lastWeekStart.setHours(0, 0, 0, 0);

function pct(curr, prev) {
  if (!prev || prev === 0) return curr > 0 ? '+∞' : '0%';
  const delta = ((curr - prev) / prev * 100).toFixed(1);
  return (delta > 0 ? '+' : '') + delta + '%';
}

function flag(curr, prev, higherIsBad = true) {
  if (curr === prev) return '  ';
  if (higherIsBad) return curr > prev ? '🔴' : '🟢';
  return curr > prev ? '🟢' : '🔴';
}

async function main() {
  if (!process.env.MONGO_URI) {
    console.error('❌ MONGO_URI not set in .env');
    process.exit(1);
  }

  await mongoose.connect(process.env.MONGO_URI);
  console.log('✅ Connected to MongoDB\n');

  // Find NobelDigital org
  const org = await Organization.findOne({
    $or: [
      { slug: /nobel/i },
      { name: /nobel/i },
      { domain: /nobel/i }
    ]
  });

  if (!org) {
    console.error('❌ NobelDigital organization not found');
    await mongoose.disconnect();
    process.exit(1);
  }

  const orgId = org._id;
  console.log(`📊 NobelDigital Week-over-Week Report`);
  console.log(`   Org: ${org.name} (${org.slug || org.domain || orgId})`);
  console.log(`   This week: ${thisWeekStart.toDateString()} → ${thisWeekEnd.toDateString()}`);
  console.log(`   Last week: ${lastWeekStart.toDateString()} → ${lastWeekEnd.toDateString()}`);
  console.log('─'.repeat(70));

  // ─── Teams ───
  const teams = await Team.find({ orgId });
  const users = await User.find({ orgId });
  console.log(`\n👥 Organization: ${teams.length} teams, ${users.length} users`);

  // ─── 1. WorkEvents (raw activity) ───
  console.log('\n═══ 1. WORK ACTIVITY (WorkEvents) ═══');
  
  const thisWeekEvents = await WorkEvent.aggregate([
    { $match: { orgId: new mongoose.Types.ObjectId(orgId), timestamp: { $gte: thisWeekStart, $lte: now } } },
    { $group: { _id: { source: '$source', eventType: '$eventType' }, count: { $sum: 1 } } }
  ]);
  
  const lastWeekEvents = await WorkEvent.aggregate([
    { $match: { orgId: new mongoose.Types.ObjectId(orgId), timestamp: { $gte: lastWeekStart, $lte: lastWeekEnd } } },
    { $group: { _id: { source: '$source', eventType: '$eventType' }, count: { $sum: 1 } } }
  ]);
  
  // Build lookup maps
  const twMap = {};
  const lwMap = {};
  let twTotal = 0, lwTotal = 0;
  
  for (const e of thisWeekEvents) {
    const key = `${e._id.source} / ${e._id.eventType}`;
    twMap[key] = e.count;
    twTotal += e.count;
  }
  for (const e of lastWeekEvents) {
    const key = `${e._id.source} / ${e._id.eventType}`;
    lwMap[key] = e.count;
    lwTotal += e.count;
  }
  
  const allKeys = [...new Set([...Object.keys(twMap), ...Object.keys(lwMap)])].sort();
  
  if (allKeys.length === 0) {
    console.log('  ⚠️  No WorkEvents found for either week');
  } else {
    console.log(`  ${'Source / Type'.padEnd(35)} ${'Last Week'.padStart(10)} ${'This Week'.padStart(10)} ${'Change'.padStart(10)}`);
    console.log('  ' + '─'.repeat(65));
    for (const key of allKeys) {
      const tw = twMap[key] || 0;
      const lw = lwMap[key] || 0;
      console.log(`  ${key.padEnd(35)} ${String(lw).padStart(10)} ${String(tw).padStart(10)} ${pct(tw, lw).padStart(10)}`);
    }
    console.log('  ' + '─'.repeat(65));
    console.log(`  ${'TOTAL'.padEnd(35)} ${String(lwTotal).padStart(10)} ${String(twTotal).padStart(10)} ${pct(twTotal, lwTotal).padStart(10)}`);
  }

  // ─── 2. IntegrationMetricsDaily ───
  if (IntegrationMetricsDaily) {
    console.log('\n═══ 2. INTEGRATION METRICS (Daily Averages) ═══');
    
    const metricsThisWeek = await IntegrationMetricsDaily.find({
      orgId: new mongoose.Types.ObjectId(orgId),
      date: { $gte: thisWeekStart, $lte: now }
    });
    
    const metricsLastWeek = await IntegrationMetricsDaily.find({
      orgId: new mongoose.Types.ObjectId(orgId),
      date: { $gte: lastWeekStart, $lte: lastWeekEnd }
    });
    
    if (metricsThisWeek.length === 0 && metricsLastWeek.length === 0) {
      console.log('  ⚠️  No IntegrationMetricsDaily data');
    } else {
      const avg = (arr, field) => {
        const vals = arr.map(m => m[field]).filter(v => v != null && !isNaN(v));
        return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
      };
      
      const fields = [
        ['meetingCount7d', 'Meetings (7d)', true],
        ['meetingDurationTotalHours7d', 'Meeting Hours (7d)', true],
        ['backToBackMeetingBlocks', 'Back-to-Back Blocks', true],
        ['messageCount7d', 'Team Messages (7d)', false],
        ['messagesPerDay', 'Messages/Day', false],
        ['afterHoursMessageCount', 'After-Hours Messages', true],
        ['afterHoursMessageRatio', 'After-Hours Msg Ratio', true],
        ['uniqueChannels7d', 'Active Channels', false],
      ];
      
      console.log(`  Data points: This week ${metricsThisWeek.length}, Last week ${metricsLastWeek.length}`);
      console.log(`  ${'Metric'.padEnd(28)} ${'Last Week'.padStart(12)} ${'This Week'.padStart(12)} ${'Change'.padStart(10)} ${''.padStart(3)}`);
      console.log('  ' + '─'.repeat(65));
      
      for (const [field, label, higherIsBad] of fields) {
        const tw = avg(metricsThisWeek, field);
        const lw = avg(metricsLastWeek, field);
        const f = higherIsBad != null ? flag(tw, lw, higherIsBad) : '  ';
        console.log(`  ${label.padEnd(28)} ${lw.toFixed(2).padStart(12)} ${tw.toFixed(2).padStart(12)} ${pct(tw, lw).padStart(10)} ${f}`);
      }
      
      // Category King metrics
      const ckFields = [
        ['categoryKingMetrics.cvir', 'CVIR (Completion Velocity)', false],
        ['categoryKingMetrics.rci', 'RCI (Rework Cost)', true],
        ['categoryKingMetrics.wap', 'WAP (Work Accumulation)', true],
        ['categoryKingMetrics.pis', 'PIS (Priority Inversion)', true],
      ];
      
      console.log('  ' + '─'.repeat(65));
      for (const [path, label, higherIsBad] of ckFields) {
        const getProp = (obj, p) => p.split('.').reduce((o, k) => o?.[k], obj);
        const tw = avg(metricsThisWeek.map(m => ({ v: getProp(m, path) })).filter(x => x.v != null).map(x => x.v), 'v') || (() => { 
          const vals = metricsThisWeek.map(m => getProp(m, path)).filter(v => v != null);
          return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
        })();
        const lw = (() => { 
          const vals = metricsLastWeek.map(m => getProp(m, path)).filter(v => v != null);
          return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : 0;
        })();
        const f = flag(tw, lw, higherIsBad);
        console.log(`  ${label.padEnd(28)} ${lw.toFixed(2).padStart(12)} ${tw.toFixed(2).padStart(12)} ${pct(tw, lw).padStart(10)} ${f}`);
      }
    }
  }

  // ─── 3. Signals (Dashboard signals) ───
  console.log('\n═══ 3. DRIFT SIGNALS ═══');
  
  const signalsThisWeek = await Signal.find({
    orgId: new mongoose.Types.ObjectId(orgId),
    detectedAt: { $gte: thisWeekStart, $lte: now }
  });
  
  const signalsLastWeek = await Signal.find({
    orgId: new mongoose.Types.ObjectId(orgId),
    detectedAt: { $gte: lastWeekStart, $lte: lastWeekEnd }
  });
  
  console.log(`  Signals detected: Last week ${signalsLastWeek.length} → This week ${signalsThisWeek.length} ${pct(signalsThisWeek.length, signalsLastWeek.length)}`);
  
  // Breakdown by severity
  const bySev = (arr, sev) => arr.filter(s => s.severity === sev).length;
  for (const sev of ['Critical', 'Risk', 'Informational']) {
    const tw = bySev(signalsThisWeek, sev);
    const lw = bySev(signalsLastWeek, sev);
    if (tw > 0 || lw > 0) {
      console.log(`    ${sev.padEnd(18)} ${String(lw).padStart(5)} → ${String(tw).padStart(5)} ${pct(tw, lw).padStart(10)} ${flag(tw, lw, true)}`);
    }
  }
  
  // Breakdown by signalType
  const byType = (arr) => {
    const map = {};
    for (const s of arr) { map[s.signalType] = (map[s.signalType] || 0) + 1; }
    return map;
  };
  const twTypes = byType(signalsThisWeek);
  const lwTypes = byType(signalsLastWeek);
  const allTypes = [...new Set([...Object.keys(twTypes), ...Object.keys(lwTypes)])].sort();
  
  if (allTypes.length > 0) {
    console.log(`\n  By Signal Type:`);
    for (const t of allTypes) {
      const tw = twTypes[t] || 0;
      const lw = lwTypes[t] || 0;
      console.log(`    ${t.padEnd(30)} ${String(lw).padStart(5)} → ${String(tw).padStart(5)} ${pct(tw, lw).padStart(10)}`);
    }
  }

  // ─── 4. CategoryKingSignals ───
  console.log('\n═══ 4. CATEGORY-KING SIGNALS (Automated Pipeline) ═══');
  
  const ckThisWeek = await CategoryKingSignal.find({
    orgId: new mongoose.Types.ObjectId(orgId),
    detectedAt: { $gte: thisWeekStart, $lte: now }
  });
  
  const ckLastWeek = await CategoryKingSignal.find({
    orgId: new mongoose.Types.ObjectId(orgId),
    detectedAt: { $gte: lastWeekStart, $lte: lastWeekEnd }
  });
  
  console.log(`  CK Signals: Last week ${ckLastWeek.length} → This week ${ckThisWeek.length}`);
  
  // High severity (>= 70)
  const highTW = ckThisWeek.filter(s => s.severity >= 70);
  const highLW = ckLastWeek.filter(s => s.severity >= 70);
  console.log(`  High severity (≥70): ${highLW.length} → ${highTW.length} ${flag(highTW.length, highLW.length, true)}`);
  
  if (highTW.length > 0) {
    console.log(`\n  ⚠️  High-severity signals this week:`);
    for (const s of highTW.sort((a, b) => b.severity - a.severity)) {
      console.log(`    [${s.severity}] ${s.signalType} — ${s.explanation?.substring(0, 80) || 'No explanation'}`);
    }
  }

  // ─── 5. BDI (Behavioral Drift Index) ───
  console.log('\n═══ 5. BEHAVIORAL DRIFT INDEX (BDI) ═══');
  
  for (const team of teams) {
    const latestBDI = await BehavioralDriftIndex.findOne({ team: team._id })
      .sort({ calculatedAt: -1 })
      .limit(1);
    
    const prevBDI = await BehavioralDriftIndex.findOne({ 
      team: team._id,
      calculatedAt: { $lt: thisWeekStart }
    }).sort({ calculatedAt: -1 }).limit(1);
    
    if (latestBDI) {
      const prev = prevBDI?.driftScore ?? '—';
      const curr = latestBDI.driftScore;
      const state = latestBDI.driftState;
      const conf = latestBDI.confidence;
      const drivers = (latestBDI.drivers || []).slice(0, 3).map(d => `${d.signal}(${d.contribution}%)`).join(', ');
      console.log(`  📋 ${team.name}`);
      console.log(`     BDI Score: ${prev} → ${curr}/100  |  State: ${state}  |  Confidence: ${conf}`);
      if (drivers) console.log(`     Top Drivers: ${drivers}`);
    }
  }

  // ─── 6. Legacy MetricsDaily ───
  if (MetricsDaily) {
    console.log('\n═══ 6. LEGACY METRICS (MetricsDaily) ═══');
    
    for (const team of teams) {
      const twMetrics = await MetricsDaily.find({
        teamId: team._id,
        date: { $gte: thisWeekStart, $lte: now }
      });
      
      const lwMetrics = await MetricsDaily.find({
        teamId: team._id,
        date: { $gte: lastWeekStart, $lte: lastWeekEnd }
      });
      
      if (twMetrics.length === 0 && lwMetrics.length === 0) continue;
      
      const avg = (arr, field) => {
        const vals = arr.map(m => m[field]).filter(v => v != null && !isNaN(v));
        return vals.length ? vals.reduce((a, b) => a + b, 0) / vals.length : null;
      };
      
      console.log(`  📋 ${team.name} (${lwMetrics.length} → ${twMetrics.length} data points)`);
      
      const legacyFields = [
        ['meetingLoadIndex', 'Meeting Load', true],
        ['afterHoursRate', 'After-Hours %', true],
        ['responseMedianMins', 'Response Time (min)', true],
        ['focusTimeRatio', 'Focus Time %', false],
      ];
      
      for (const [field, label, bad] of legacyFields) {
        const tw = avg(twMetrics, field);
        const lw = avg(lwMetrics, field);
        if (tw != null || lw != null) {
          console.log(`     ${label.padEnd(22)} ${(lw ?? 0).toFixed(2).padStart(10)} → ${(tw ?? 0).toFixed(2).padStart(10)} ${pct(tw ?? 0, lw ?? 0).padStart(10)} ${flag(tw ?? 0, lw ?? 0, bad)}`);
        }
      }
    }
  }

  // ─── 7. Integration Connection Status ───
  console.log('\n═══ 7. INTEGRATION STATUS ═══');
  const integrations = org.integrations || {};
  const checkInt = (name, path) => {
    const hasToken = !!path?.accessToken;
    const lastSync = path?.sync?.lastSync;
    const status = path?.sync?.status;
    const events = path?.sync?.eventsCount;
    console.log(`  ${hasToken ? '✅' : '❌'} ${name.padEnd(18)} ${hasToken ? 'Connected' : 'Not connected'}${lastSync ? ` | Last sync: ${new Date(lastSync).toLocaleString()}` : ''}${status ? ` | Status: ${status}` : ''}${events != null ? ` | Events: ${events}` : ''}`);
  };
  
  checkInt('Slack', integrations.slack);
  checkInt('Google Calendar', integrations.google);
  checkInt('Google Chat', integrations.googleChat);
  checkInt('Microsoft', integrations.microsoft);

  console.log('\n' + '═'.repeat(70));
  console.log('Report generated at:', now.toLocaleString());
  
  await mongoose.disconnect();
}

main().catch(err => {
  console.error('Script error:', err);
  process.exit(1);
});
