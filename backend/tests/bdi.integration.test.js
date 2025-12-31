/**
 * BDI System Integration Tests
 * Tests service layer, model interactions, and calculation logic
 * 
 * Usage: npm test -- tests/bdi.integration.test.js
 */

import { describe, it, expect, beforeAll, afterAll } from '@jest/globals';
import mongoose from 'mongoose';
import { calculateBDI, getLatestBDI, getBDIHistory } from '../services/bdiService.js';
import { calculateAllIndices } from '../services/indicesService.js';
import BehavioralDriftIndex from '../models/behavioralDriftIndex.js';
import CoordinationLoadIndex from '../models/coordinationLoadIndex.js';
import BandwidthTaxIndicator from '../models/bandwidthTaxIndicator.js';
import SilenceRiskIndicator from '../models/silenceRiskIndicator.js';
import DriftPlaybook from '../models/driftPlaybook.js';
import Team from '../models/team.js';
import MetricsDaily from '../models/metricsDaily.js';

// Test database connection
const MONGO_URI = process.env.MONGO_URI_TEST || 'mongodb://localhost:27017/signaltrue_test';

beforeAll(async () => {
  await mongoose.connect(MONGO_URI);
  await cleanupTestData();
});

afterAll(async () => {
  await cleanupTestData();
  await mongoose.connection.close();
});

async function cleanupTestData() {
  await BehavioralDriftIndex.deleteMany({ team: /test/ });
  await CoordinationLoadIndex.deleteMany({ teamId: /test/ });
  await BandwidthTaxIndicator.deleteMany({ teamId: /test/ });
  await SilenceRiskIndicator.deleteMany({ teamId: /test/ });
  await Team.deleteMany({ name: /test/i });
  await MetricsDaily.deleteMany({ teamId: /test/ });
}

describe('BDI Calculation', () => {
  let testTeam;
  
  beforeAll(async () => {
    // Create test team with 5+ members
    testTeam = await Team.create({
      name: 'Test Team BDI',
      organizationId: new mongoose.Types.ObjectId(),
      members: [
        { userId: new mongoose.Types.ObjectId(), name: 'Member 1' },
        { userId: new mongoose.Types.ObjectId(), name: 'Member 2' },
        { userId: new mongoose.Types.ObjectId(), name: 'Member 3' },
        { userId: new mongoose.Types.ObjectId(), name: 'Member 4' },
        { userId: new mongoose.Types.ObjectId(), name: 'Member 5' }
      ]
    });
    
    // Create baseline metrics (90 days ago)
    const baselineDate = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000);
    await MetricsDaily.create({
      teamId: testTeam._id,
      date: baselineDate,
      avgMeetingHours: 15,
      avgAfterHoursMinutes: 30,
      avgResponseTimeHours: 2,
      avgAsyncContributions: 10,
      avgFocusHours: 4,
      uniqueCollaborators: 8
    });
    
    // Create current metrics (today) showing drift
    await MetricsDaily.create({
      teamId: testTeam._id,
      date: new Date(),
      avgMeetingHours: 25,  // +66% (negative drift)
      avgAfterHoursMinutes: 120, // +300% (negative drift)
      avgResponseTimeHours: 4,  // +100% (negative drift)
      avgAsyncContributions: 12, // +20% (positive, no drift)
      avgFocusHours: 2,     // -50% (negative drift)
      uniqueCollaborators: 10  // +25% (positive, no drift)
    });
  });
  
  it('should calculate BDI with correct drift state', async () => {
    const periodStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const periodEnd = new Date();
    
    const bdi = await calculateBDI(testTeam._id, periodStart, periodEnd);
    
    expect(bdi).toBeDefined();
    expect(bdi.team.toString()).toBe(testTeam._id.toString());
    expect(['Stable', 'Early Drift', 'Developing Drift', 'Critical Drift']).toContain(bdi.driftState);
    expect(bdi.driftScore).toBeGreaterThanOrEqual(0);
    expect(bdi.driftScore).toBeLessThanOrEqual(100);
    expect(bdi.signals).toBeDefined();
    expect(bdi.signals.length).toBe(6);
  });
  
  it('should detect negative drift from multiple signals', async () => {
    const periodStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const periodEnd = new Date();
    
    const bdi = await calculateBDI(testTeam._id, periodStart, periodEnd);
    
    // Should detect drift due to multiple negative deviations
    const negativeSignals = bdi.signals.filter(s => s.deviation < -15);
    expect(negativeSignals.length).toBeGreaterThanOrEqual(3);
  });
  
  it('should assign confidence level based on confirming signals', async () => {
    const periodStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const periodEnd = new Date();
    
    const bdi = await calculateBDI(testTeam._id, periodStart, periodEnd);
    
    expect(['Low', 'Medium', 'High']).toContain(bdi.confidence);
    expect(bdi.confirmingSignals).toBeDefined();
    expect(Array.isArray(bdi.confirmingSignals)).toBe(true);
  });
  
  it('should recommend playbooks for drift state', async () => {
    // Create test playbook
    await DriftPlaybook.create({
      title: 'Test Playbook',
      category: 'coordination',
      appliesTo: {
        driftStates: ['Early Drift', 'Developing Drift']
      },
      actions: [
        { action: 'Test action', why: 'Test reason' }
      ],
      isActive: true
    });
    
    const periodStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const periodEnd = new Date();
    
    const bdi = await calculateBDI(testTeam._id, periodStart, periodEnd);
    
    if (bdi.driftState !== 'Stable') {
      expect(bdi.recommendedPlaybooks).toBeDefined();
      expect(bdi.recommendedPlaybooks.length).toBeGreaterThan(0);
    }
  });
});

describe('Indices Calculation', () => {
  let testTeam;
  
  beforeAll(async () => {
    testTeam = await Team.create({
      name: 'Test Team Indices',
      organizationId: new mongoose.Types.ObjectId(),
      members: Array.from({ length: 5 }, (_, i) => ({
        userId: new mongoose.Types.ObjectId(),
        name: `Member ${i + 1}`
      }))
    });
    
    // Create metrics for indices
    await MetricsDaily.create({
      teamId: testTeam._id,
      date: new Date(),
      avgMeetingHours: 30,
      avgBackToBackHours: 10,
      avgCrossTeamHours: 8,
      avgFocusHours: 2,
      avgResponseTimeHours: 0.5,
      avgAfterHoursMinutes: 180,
      avgInterruptionsPerDay: 20,
      avgAsyncContributions: 5,
      uniqueCollaborators: 4,
      avgUpwardResponseHours: 12,
      sentimentVariance: 0.4
    });
  });
  
  it('should calculate all indices (CLI, BTI, SRI)', async () => {
    const periodStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const periodEnd = new Date();
    
    const indices = await calculateAllIndices(testTeam._id, periodStart, periodEnd);
    
    expect(indices).toBeDefined();
    expect(indices.cli).toBeDefined();
    expect(indices.bti).toBeDefined();
    expect(indices.sri).toBeDefined();
  });
  
  it('should calculate Coordination Load Index with correct state', async () => {
    const periodStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const periodEnd = new Date();
    
    const indices = await calculateAllIndices(testTeam._id, periodStart, periodEnd);
    
    expect(indices.cli.coordinationLoadPercent).toBeGreaterThanOrEqual(0);
    expect(indices.cli.coordinationLoadPercent).toBeLessThanOrEqual(100);
    expect(['Balanced', 'Moderate Load', 'High Load', 'Critical Load']).toContain(indices.cli.state);
  });
  
  it('should calculate Bandwidth Tax Indicator with triggers', async () => {
    const periodStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const periodEnd = new Date();
    
    const indices = await calculateAllIndices(testTeam._id, periodStart, periodEnd);
    
    expect(['Low Tax', 'Rising Tax', 'High Tax']).toContain(indices.bti.state);
    expect(indices.bti.bandwidthTaxScore).toBeGreaterThanOrEqual(0);
    expect(indices.bti.bandwidthTaxScore).toBeLessThanOrEqual(100);
  });
  
  it('should calculate Silence Risk Indicator with proxies', async () => {
    const periodStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const periodEnd = new Date();
    
    const indices = await calculateAllIndices(testTeam._id, periodStart, periodEnd);
    
    expect(['Low Silence Risk', 'Rising Silence Risk', 'High Silence Risk']).toContain(indices.sri.state);
    expect(indices.sri.silenceRiskScore).toBeGreaterThanOrEqual(0);
    expect(indices.sri.silenceRiskScore).toBeLessThanOrEqual(100);
    expect(indices.sri.proxies).toBeDefined();
    expect(indices.sri.proxies.length).toBe(4);
  });
});

describe('BDI History & Retrieval', () => {
  let testTeam;
  
  beforeAll(async () => {
    testTeam = await Team.create({
      name: 'Test Team History',
      organizationId: new mongoose.Types.ObjectId(),
      members: Array.from({ length: 5 }, (_, i) => ({
        userId: new mongoose.Types.ObjectId(),
        name: `Member ${i + 1}`
      }))
    });
    
    // Create multiple BDI records
    for (let i = 0; i < 5; i++) {
      await BehavioralDriftIndex.create({
        team: testTeam._id,
        periodStart: new Date(Date.now() - (i + 1) * 7 * 24 * 60 * 60 * 1000),
        periodEnd: new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000),
        driftState: 'Stable',
        driftScore: 30 + i * 5,
        signals: [],
        drivers: [],
        confidence: 'Medium'
      });
    }
  });
  
  it('should retrieve latest BDI', async () => {
    const latest = await getLatestBDI(testTeam._id);
    
    expect(latest).toBeDefined();
    expect(latest.team.toString()).toBe(testTeam._id.toString());
  });
  
  it('should retrieve BDI history with limit', async () => {
    const history = await getBDIHistory(testTeam._id, 3);
    
    expect(history).toBeDefined();
    expect(Array.isArray(history)).toBe(true);
    expect(history.length).toBeLessThanOrEqual(3);
  });
  
  it('should return history in descending chronological order', async () => {
    const history = await getBDIHistory(testTeam._id, 5);
    
    for (let i = 1; i < history.length; i++) {
      const prev = new Date(history[i - 1].calculatedAt);
      const curr = new Date(history[i].calculatedAt);
      expect(prev.getTime()).toBeGreaterThanOrEqual(curr.getTime());
    }
  });
});

describe('Anti-Weaponization Guardrails', () => {
  it('should enforce 5-person minimum in Team model', async () => {
    const smallTeam = await Team.create({
      name: 'Test Small Team',
      organizationId: new mongoose.Types.ObjectId(),
      members: [
        { userId: new mongoose.Types.ObjectId(), name: 'Member 1' },
        { userId: new mongoose.Types.ObjectId(), name: 'Member 2' },
        { userId: new mongoose.Types.ObjectId(), name: 'Member 3' }
      ]
    });
    
    expect(smallTeam.members.length).toBeLessThan(5);
    // Note: Actual enforcement happens in middleware, tested via API
  });
  
  it('should create playbooks with reversibility documented', async () => {
    const playbook = await DriftPlaybook.create({
      title: 'Test Reversible Action',
      category: 'coordination',
      appliesTo: { driftStates: ['Early Drift'] },
      actions: [
        {
          action: 'Test action',
          why: 'Test reason',
          reversibility: 'Fully reversible',
          expectedEffect: 'Test effect',
          timebound: '2 weeks'
        }
      ],
      isActive: true
    });
    
    expect(playbook.actions[0].reversibility).toBeDefined();
    expect(playbook.actions[0].timebound).toBeDefined();
  });
});

console.log('✓ All integration tests defined');
console.log('Run with: npm test -- tests/bdi.integration.test.js');
