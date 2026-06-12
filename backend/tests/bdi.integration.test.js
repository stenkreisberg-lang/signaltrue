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
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongoServer;

beforeAll(async () => {
  if (!process.env.MONGO_URI_TEST) {
    mongoServer = await MongoMemoryServer.create();
  }
  const mongoUri = process.env.MONGO_URI_TEST || mongoServer.getUri();
  await mongoose.connect(mongoUri);
  await cleanupTestData();
});

afterAll(async () => {
  await cleanupTestData();
  await mongoose.connection.close();
  if (mongoServer) await mongoServer.stop();
});

async function cleanupTestData() {
  await BehavioralDriftIndex.deleteMany({});
  await CoordinationLoadIndex.deleteMany({});
  await BandwidthTaxIndicator.deleteMany({});
  await SilenceRiskIndicator.deleteMany({});
  await Team.deleteMany({});
  await MetricsDaily.deleteMany({});
  await DriftPlaybook.deleteMany({});
}

describe('BDI Calculation', () => {
  let testTeam;

  beforeAll(async () => {
    // Create test team with 5+ members
    testTeam = await Team.create({
      name: 'Test Team BDI',
      orgId: new mongoose.Types.ObjectId(),
      members: [
        { userId: new mongoose.Types.ObjectId(), name: 'Member 1' },
        { userId: new mongoose.Types.ObjectId(), name: 'Member 2' },
        { userId: new mongoose.Types.ObjectId(), name: 'Member 3' },
        { userId: new mongoose.Types.ObjectId(), name: 'Member 4' },
        { userId: new mongoose.Types.ObjectId(), name: 'Member 5' },
      ],
    });

    // Create baseline metrics (90 days ago)
    const baselineDate = new Date(Date.now() - 14 * 24 * 60 * 60 * 1000);
    await MetricsDaily.create({
      teamId: testTeam._id,
      date: baselineDate,
      meetingHoursWeek: 15,
      afterHoursRate: 0.1,
      responseMedianMins: 120,
      messageCount: 10,
      focusHoursWeek: 4,
      uniqueContacts: 8,
    });

    // Create current metrics (today) showing drift
    await MetricsDaily.create({
      teamId: testTeam._id,
      date: new Date(),
      meetingHoursWeek: 25, // +66% (negative drift)
      afterHoursRate: 0.4, // +300% (negative drift)
      responseMedianMins: 240, // +100% (negative drift)
      messageCount: 12, // +20% (positive, no drift)
      focusHoursWeek: 2, // -50% (negative drift)
      uniqueContacts: 10, // +25% (positive, no drift)
    });
  });

  it('should calculate BDI with correct drift state', async () => {
    const periodStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const periodEnd = new Date();

    const bdi = await calculateBDI(testTeam._id, periodStart, periodEnd);

    expect(bdi).toBeDefined();
    expect(bdi.teamId.toString()).toBe(testTeam._id.toString());
    expect(['Stable', 'Early Drift', 'Developing Drift', 'Critical Drift']).toContain(bdi.state);
    expect(bdi.driftScore).toBeGreaterThanOrEqual(0);
    expect(bdi.driftScore).toBeLessThanOrEqual(100);
    expect(bdi.signals).toBeDefined();
    expect(Object.keys(bdi.signals.toObject())).toHaveLength(6);
  });

  it('should detect negative drift from multiple signals', async () => {
    const periodStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const periodEnd = new Date();

    const bdi = await calculateBDI(testTeam._id, periodStart, periodEnd);

    // Should detect drift due to multiple negative deviations
    expect(bdi.negativeSignalsCount).toBeGreaterThanOrEqual(3);
  });

  it('should assign confidence level based on confirming signals', async () => {
    const periodStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const periodEnd = new Date();

    const bdi = await calculateBDI(testTeam._id, periodStart, periodEnd);

    expect(['Low', 'Medium', 'High']).toContain(bdi.confidence.level);
    expect(bdi.confidence.confirmingSignals).toBeGreaterThanOrEqual(0);
  });

  it('should recommend playbooks for drift state', async () => {
    // Create test playbook
    await DriftPlaybook.create({
      name: 'Test Playbook',
      category: 'Coordination Restructure',
      appliesTo: {
        driftStates: ['Early Drift', 'Developing Drift'],
      },
      action: {
        title: 'Test action',
        description: 'Reduce avoidable coordination load.',
        timebound: '2 weeks',
      },
      why: 'Test reason',
      expectedEffect: { description: 'Lower meeting load.' },
      reversibility: { isReversible: true, note: 'Fully reversible.' },
      effort: { level: 'Low' },
      isActive: true,
    });

    const periodStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const periodEnd = new Date();

    const bdi = await calculateBDI(testTeam._id, periodStart, periodEnd);

    if (bdi.state !== 'Stable') {
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
      orgId: new mongoose.Types.ObjectId(),
      members: Array.from({ length: 5 }, (_, i) => ({
        userId: new mongoose.Types.ObjectId(),
        name: `Member ${i + 1}`,
      })),
    });

    // Create metrics for indices
    await MetricsDaily.create({
      teamId: testTeam._id,
      date: new Date(),
      meetingHoursWeek: 30,
      backToBackBlocks: 10,
      crossTeamContacts: 8,
      focusHoursWeek: 2,
      responseMedianMins: 30,
      afterHoursRate: 0.45,
      messageCount: 5,
      uniqueContacts: 4,
      sentimentShift: 0.4,
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

    expect(indices.cli.coordinationLoad).toBeGreaterThanOrEqual(0);
    expect([
      'Execution-dominant',
      'Balanced',
      'Coordination-heavy',
      'Coordination overload',
    ]).toContain(indices.cli.state);
  });

  it('should calculate Bandwidth Tax Indicator with triggers', async () => {
    const periodStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const periodEnd = new Date();

    const indices = await calculateAllIndices(testTeam._id, periodStart, periodEnd);

    expect(['Low tax', 'Moderate tax', 'Severe tax']).toContain(indices.bti.state);
    expect(indices.bti.bandwidthTaxScore).toBeGreaterThanOrEqual(0);
    expect(indices.bti.bandwidthTaxScore).toBeLessThanOrEqual(100);
  });

  it('should calculate Silence Risk Indicator with proxies', async () => {
    const periodStart = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const periodEnd = new Date();

    const indices = await calculateAllIndices(testTeam._id, periodStart, periodEnd);

    expect(['Low Silence Risk', 'Rising Silence Risk', 'High Silence Risk']).toContain(
      indices.sri.state
    );
    expect(indices.sri.silenceRiskScore).toBeGreaterThanOrEqual(0);
    expect(indices.sri.silenceRiskScore).toBeLessThanOrEqual(100);
    expect(indices.sri.proxies).toBeDefined();
    expect(Array.isArray(indices.sri.proxies)).toBe(true);
  });
});

describe('BDI History & Retrieval', () => {
  let testTeam;

  beforeAll(async () => {
    testTeam = await Team.create({
      name: 'Test Team History',
      orgId: new mongoose.Types.ObjectId(),
      members: Array.from({ length: 5 }, (_, i) => ({
        userId: new mongoose.Types.ObjectId(),
        name: `Member ${i + 1}`,
      })),
    });

    // Create multiple BDI records
    for (let i = 0; i < 5; i++) {
      await BehavioralDriftIndex.create({
        orgId: testTeam.orgId,
        teamId: testTeam._id,
        periodStart: new Date(Date.now() - (i + 1) * 7 * 24 * 60 * 60 * 1000),
        periodEnd: new Date(Date.now() - i * 7 * 24 * 60 * 60 * 1000),
        state: 'Stable',
        driftScore: 30 + i * 5,
        signals: {
          meetingLoad: { value: 0 },
          afterHoursActivity: { value: 0 },
          responseTime: { value: 0 },
          asyncParticipation: { value: 0 },
          focusTime: { value: 0 },
          collaborationBreadth: { value: 0 },
        },
        confidence: { level: 'Medium' },
      });
    }
  });

  it('should retrieve latest BDI', async () => {
    const latest = await getLatestBDI(testTeam._id);

    expect(latest).toBeDefined();
    expect(latest.teamId.toString()).toBe(testTeam._id.toString());
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
      const prev = new Date(history[i - 1].periodStart);
      const curr = new Date(history[i].periodStart);
      expect(prev.getTime()).toBeGreaterThanOrEqual(curr.getTime());
    }
  });
});

describe('Anti-Weaponization Guardrails', () => {
  it('should retain actual team size for the configurable guard', async () => {
    const smallTeam = await Team.create({
      name: 'Test Small Team',
      orgId: new mongoose.Types.ObjectId(),
      metadata: { actualSize: 3 },
    });

    expect(smallTeam.metadata.actualSize).toBe(3);
    // Note: Actual enforcement happens in middleware, tested via API
  });

  it('should create playbooks with reversibility documented', async () => {
    const playbook = await DriftPlaybook.create({
      name: 'Test Reversible Action',
      category: 'Coordination Restructure',
      appliesTo: { driftStates: ['Early Drift'] },
      action: {
        title: 'Test action',
        description: 'Try a reversible working agreement.',
        timebound: '2 weeks',
      },
      why: 'Test reason',
      expectedEffect: { description: 'Test effect' },
      reversibility: { isReversible: true, note: 'Fully reversible' },
      effort: { level: 'Low' },
      isActive: true,
    });

    expect(playbook.reversibility.note).toBeDefined();
    expect(playbook.action.timebound).toBeDefined();
  });
});

console.log('✓ All integration tests defined');
console.log('Run with: npm test -- tests/bdi.integration.test.js');
